/**
 * 实现了比对vdom更新的react
 * 即使是实dom元素 也不再负责直接操作dom了，统一让vdom处理
 * 因此TextWrapper 和 ElementWrapper 都要继承Component
 */
import { insertChildren, replaceContent } from './utils';
import { RENDER_DOM, update } from './dom';

export abstract class Component {
  protected props;
  protected state;
  protected children;
  protected root;

  protected range;
  protected vdom;
  protected render?(): ElementWrapper | Component | any;

  protected constructor() {
    this.props = Object.create({});
    this.children = [];
    this.root = null;
    this.range = null;
    this.vdom = null;
  }

  // 递归下降解析直到遇到实dom, 直接调用有意义的getVdom
  public getVdom() {
    return this.render!().getVdom();
  }

  public setAttribute(name, value) {
    this.props[name] = value;
  }
  public appendChild(component) {
    this.children.push(component);
  }

  public [RENDER_DOM](range) {
    this.range = range;
    this.vdom = this.getVdom();
    (this.vdom as Component)[RENDER_DOM](range);
  }

  public update() {
    let newVdom = this.getVdom();
    update(this.vdom, newVdom);
    this.vdom = newVdom;
  }

  protected setState(newState: object) {
    if (this.state === null || typeof this.state !== 'object') {
      this.state = newState;
      this.update();
      return;
    }
    this.merge(this.state, newState);
    this.update();
  }

  private merge(oldState, newState) {
    for (let p in newState) {
      if (oldState[p] === null || typeof oldState[p] !== 'object') {
        oldState[p] = newState[p];
      } else {
        this.merge(oldState[p], newState[p]);
      }
    }
  }
}

export class ElementWrapper extends Component {
  private readonly type: string;
  private vchildren: any;
  constructor(type) {
    super();
    this.type = type;
  }

  // 虚拟dom树就是js对象组成的一棵树
  public getVdom() {
    this.vchildren = this.children.map(child => child.getVdom());
    return this;
  }

  [RENDER_DOM](range: Range) {
    // range 就是当前元素本身的range
    this.range = range;
    let root = document.createElement(this.type);
    for (let name in this.props) {
      let value = this.props[name];
      if (name.match(/^on([\s\S]+)$/)) {
        root.addEventListener(
          RegExp.$1.replace(/^[\s\S]/, c => c.toLowerCase()),
          value
        );
      }
      if (name === 'className') {
        root.setAttribute('class', value);
      } else {
        root.setAttribute(name, value);
      }
    }

    if (!this.vchildren) {
      this.vchildren = this.children.map(child => child.getVdom());
    }
    // 顺序更新，一个一个的添加到当前新创建的root的childNodes里面
    // 他们实际应该是fragment, 所以还没有真实的到页面上
    // 使用range 可以灵活的只针对需要的位置做修改，而不用去全体替换
    for (let child of this.vchildren) {
      let childRange = document.createRange();
      childRange.setStart(root, root.childNodes.length);
      childRange.setEnd(root, root.childNodes.length);
      child[RENDER_DOM](childRange);
    }
    // 用root 替换 旧的 root
    replaceContent(range, root);
  }
}

export class TextWrapper extends Component {
  public readonly content: string;
  public readonly type: string;
  constructor(content) {
    super();
    this.content = content;
    this.type = '#text';
  }

  public getVdom() {
    return this;
  }

  [RENDER_DOM](range: Range) {
    this.range = range;
    let root = document.createTextNode(this.content);
    replaceContent(range, root);
  }
}

export function createElement(type, attributes, ...children) {
  let el: Component;
  if (typeof type === 'string') {
    el = new ElementWrapper(type);
  } else {
    el = new type;
  }

  for (let p in attributes) {
    el.setAttribute(p, attributes[p]);
  }
  insertChildren(el, children);
  return el;
}

