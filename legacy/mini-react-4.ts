/**
 * 即使是实dom元素 也不再负责直接操作dom了，统一让vdom处理
 * 因此TextWrapper 和 ElementWrapper 都要继承Component
 */
const RENDER_DOM = Symbol('render to dom');

export abstract class Component {
  protected props;
  protected state;
  protected children;
  protected root;

  private range;
  protected lastVdom;
  protected render?(): ElementWrapper | Component | any;

  protected constructor() {
    this.props = Object.create({});
    this.children = [];
    this.root = null;
    this.range = null;
    this.lastVdom = null;
  }

  get vdom() {
    return this.render!().vdom;
  }

  get vchildren() {
    return this.children.map(child => child.vdom);
  }
  setAttribute(name, value) {
    this.props[name] = value;
  }

  appendChild(component) {
    this.children.push(component);
  }

  [RENDER_DOM](range) {
    this.range = range;
    this.lastVdom = this.vdom;
    this.render!()[RENDER_DOM](range);
  }

  update() {

  }

  rerender = () => {
    let oldRange = this.range;
    let range = document.createRange();
    range.setStart(oldRange.startContainer, oldRange.startOffset);
    range.setEnd(oldRange.startContainer, oldRange.startOffset);
    this[RENDER_DOM](range);
    oldRange.setStart(range.endContainer, range.endOffset);
    oldRange.deleteContents();
  };

  protected setState(newState: object) {
    if (this.state === null || typeof this.state !== 'object') {
      this.state = newState;
      this.rerender();
      return;
    }
    this.merge(this.state, newState);
    this.rerender();
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

class ElementWrapper extends Component {
  private readonly type: string;
  constructor(type) {
    super();
    this.type = type;
  }

  // 虚拟dom树就是js对象组成的一棵树
  get vdom() {
    return this;
  }

  [RENDER_DOM](range: Range) {
    range.deleteContents();
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
    for (let child of this.children) {
      let childRange = document.createRange();
      childRange.setStart(root, root.childNodes.length);
      childRange.setEnd(root, root.childNodes.length);
      child[RENDER_DOM](childRange);
    }
    // 所有insert的操作都发生在父节点透传过来的range上
    range.insertNode(root);
  }
}

class TextWrapper extends Component {
  private readonly content: string;
  private readonly type: string;
  protected readonly root: Text;
  constructor(content) {
    super();
    this.content = content;
    this.type = '#text';
    this.root = document.createTextNode(content);
  }
  get vdom() {
    return this;
  }

  [RENDER_DOM](range: Range) {
    range.deleteContents();
    range.insertNode(this.root);
  }
}

export function createElement(type, attributes, ...children) {
  let el: Component;
  if (typeof type === 'string') {
    el = new ElementWrapper(type);
  } else {
    el = new type();
  }

  for (let p in attributes) {
    el.setAttribute(p, attributes[p]);
  }
  insertChildren(el, children);
  return el;
}

export function render(component: Component, parentElement) {
  let range = document.createRange();
  range.setStart(parentElement, 0);
  range.setEnd(parentElement, parentElement.childNodes.length);
  range.deleteContents();
  component[RENDER_DOM](range);
}

export default class MiniReact {
  static createElement = createElement;
  static render = render;
  static Component = Component;
}

function insertChildren(el, children) {
  for (let child of children) {
    if (typeof child === 'string') {
      child = new TextWrapper(child);
    }
    if (child === null) {
      continue;
    }
    if (typeof child === 'object' && child instanceof Array) {
      insertChildren(el, child);
    } else {
      el.appendChild(child);
    }
  }
}
