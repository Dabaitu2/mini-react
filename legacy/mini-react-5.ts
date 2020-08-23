/**
 * 实现了比对vdom更新的react
 * 即使是实dom元素 也不再负责直接操作dom了，统一让vdom处理
 * 因此TextWrapper 和 ElementWrapper 都要继承Component
 */
const RENDER_DOM = Symbol('render to dom');

export abstract class Component {
  protected props;
  protected state;
  protected children;
  protected root;

  protected range;
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
    // 存下上一次的vdom。留待下一次更新比对
    this.lastVdom = this.vdom;
    (this.lastVdom as Component)[RENDER_DOM](range);
  }

  update() {
    let update = (oldNode, newNode) => {
      if (!isSameNode(oldNode, newNode)) {
        newNode[RENDER_DOM](oldNode.range);
        return;
      }
      newNode.range = oldNode.range;
      let newChildren = newNode.vchildren;
      let oldChildren = oldNode.vchildren;

      if (!newChildren || !newChildren.length) {
        return;
      }

      let tailRange = oldChildren[oldChildren.length - 1].range;

      for (let i = 0; i < newChildren.length; i++) {
        let newChild = newChildren[i];
        let oldChild = oldChildren[i];
        if (i < oldChildren.length) {
          update(oldChild, newChild);
        } else {
          let range = document.createRange();
          // startContainer 返回range开始的节点
          // startOffset 返回表示Range在startContainer中的起始位置的数字
          // 如果起始节点类型是 Text， Comment, or CDATASection之一,
          // 那么 startOffset指的是从起始节点算起字符的偏移量。
          // 对于其他 Node 类型节点，
          // startOffset 是指从起始结点开始算起子节点的偏移量。
          // 如range.setStart(p,0)- 设定该选择范围是p父元素的第0个child节点
          // range.setEnd(p,2)-指定该range将延展到p父元素的第2个child但不包含，也就是左闭右开区间
          range.setStart(tailRange.endContainer, tailRange.endOffset);
          range.setEnd(tailRange.endContainer, tailRange.endOffset);
          newChild[RENDER_DOM](range);
          tailRange = range;
        }
      }
    };
    let newVdom = this.vdom;
    update(this.lastVdom, newVdom);
    this.lastVdom = newVdom;
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
  vchildren: any;
  constructor(type) {
    super();
    this.type = type;
  }

  // 虚拟dom树就是js对象组成的一棵树
  get vdom() {
    this.vchildren = this.children.map(child => child.vdom);
    return this;
  }

  [RENDER_DOM](range: Range) {
    this.range = range;
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

    if (!this.vchildren) {
      this.vchildren = this.children.map(child => child.vdom);
    }
    for (let child of this.vchildren) {
      let childRange = document.createRange();
      childRange.setStart(root, root.childNodes.length);
      childRange.setEnd(root, root.childNodes.length);
      child[RENDER_DOM](childRange);
    }
    // 所有insert的操作都发生在父节点透传过来的range上
    replaceContent(range, this.root);
    range.insertNode(root);
  }
}

class TextWrapper extends Component {
  public readonly content: string;
  public readonly type: string;
  constructor(content) {
    super();
    this.content = content;
    this.type = '#text';
  }
  get vdom() {
    return this;
  }

  [RENDER_DOM](range: Range) {
    let root = document.createTextNode(this.content);
    this.range = range;
    range.deleteContents();
    range.insertNode(root);
    replaceContent(range, root);
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

function insertChildren(el: Component, children: any[]) {
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

function replaceContent(range: Range, node) {
  range.insertNode(node);
  range.setStartAfter(node);
  range.deleteContents();
  range.setStartBefore(node);
  range.setEndAfter(node);
}

function isSameNode(oldNode, newNode) {
  if (oldNode.type !== newNode.type) {
    return false;
  }
  for (let name in newNode.props) {
    if (newNode.props[name] !== oldNode.props[name]) {
      return false;
    }
  }
  if (Object.keys(oldNode.props).length !== Object.keys(newNode.props).length) {
    return false;
  }
  if (isTextWrapper(newNode)) {
    if (newNode.content !== oldNode.content) {
      return false;
    }
  }
  return true;
}
function isTextWrapper(node: any): node is TextWrapper {
  return node.type === '#text';
}
