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

  // getVdom 过程是自底向上的
  // 然后再自顶向下的去 render_dom
  // 对于Component，实际上，由render方法创建的range无法框选住它的任何元素
  // 实际上框选的都是其向下递归后获得的实dom
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

  // 只有在实dom才能真正的获得range并操纵。
  // 有几种情况
  // 1. range是最外层ReactDOM.render 传入的挂载点的range
  // 2. 对于内部嵌套元素, range是外部元素ElementWrapper的vChildren循环创建的childRange
  // 3. 对于setState 更新时，range是逐项比对新旧children对应的老ElementWrapper的range
  // 我们的实现中，对于自定义组件，不能只在render中返回this.children，因为调用createElement的时候，需要符合树形结构
  // 而直接使用this.children 会导致这棵树没有根
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
    // 在这里可以创建新的range
    // 顺序更新，一个一个的追加到当前新创建的root的childNodes后面，
    // 在通过调用child的render_dom, 将child元素自身的this.range 填充上应有的element
    // 他们实际应该是fragment, 所以还没有真实的到页面上
    // 使用range 可以灵活的只针对需要的位置做修改，而不用去全体替换
    // child和父range关联的方式就是通过vChildren, 因为这些child的操作都是修改引用
    // 而vChildren 始终维护者连接关系。
    for (let child of this.vchildren) {
      let childRange = document.createRange();
      // 这两步将range关联到了新创建的root的子节点，这个时候其实还没有和dom产生实际关联
      // 一开始的子节点肯定是空的，不用担心会不会有啥莫名其妙的东西
      // 只是做了一个由空逐渐填满的操作
      childRange.setStart(root, root.childNodes.length);
      childRange.setEnd(root, root.childNodes.length);
      child[RENDER_DOM](childRange);
    }
    // 用root 替换 旧的 root
    // 在这里，实现了新建的root对原始的root所在range中的root的替换，
    // 同时也让新root上的child，以及child上关联range所修改，产生的新的dom元素成功挂载到了dom树上
    // 使得其不是"浮萍"，render_dom 所做的修改也是货真价实的
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

