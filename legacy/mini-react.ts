/**
 * 其实我感觉这个文件应该叫MiniReactDOM...
 */



/**
 * 为了在createElement 处理到用户自定义的组件时，可以正常的创建节点/设置属性
 * 不能直接使用原生的dom操作来处理。而是需要把原生节点也全部包装成React组件
 */
class ElementWrapper {
  public root: HTMLElement;
  constructor(type) {
    this.root = document.createElement(type);
  }

  setAttribute(name, value) {
    this.root.setAttribute(name, value);
  }

  appendChild(component) {
    this.root.appendChild(component.root);
  }
}


/**
 * 文本节点没有属性, 也不会有child
 */
class TextWrapper {
  public root: Text;
  constructor(content) {
    this.root = document.createTextNode(content);
  }
}


/**
 * 用户自己定义的组件依然要具有被createElement解析的能力
 * 所以React要求自定义class组件都要继承一个Component类，这样可以帮忙注入一些解析时需要的默认实现
 * 在react中，自定义的控件的"attribute"实际上会被叫做"props"。 在这里沿用这个名字
 */
abstract class Component {
  protected readonly props;
  protected state;
  public readonly children;
  private _root;
  protected constructor() {
    // 这个操作可以保证该变量是绝对空的，不会通过forin找到原型链上的方法
    // 从而在forin时不用做额外的hasOwnProperty判断从而损伤性能
    this.props = Object.create({});
    this.children = [];
    // 自定义的root实际是什么需要在render方法里实现
    // this.root = null;
  }

  setAttribute(name, value) {
    this.props[name] = value;
  }

  appendChild(component) {
    this.children.push(component);
  }

  /**
   * render 必须要由用户实现
   * 可以返回一个包装后的HTMLElement
   * 也可以返回一个子组件
   * 如果遇到了子组件(Component)，调用root的时候，还需要递归解析
   */
  abstract render(): ElementWrapper | Component;

  get root() {
    if (!this._root) {
      this._root = this.render().root;
    }
    return this._root;
  }
}


/**
 * 创建一个
 * @param type
 * @param attributes
 * @param children
 */
export function createElement(type, attributes, ...children) {
  let el;
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


/**
 * 这个render针对的是实dom, 直接使用原生Dom 方法即可
 * 这里本来有些边界情况，比如参数1传进来的是原生dom
 * 为了处理方便，这边暂时搞成只允许用户传个Component进来
 * @param component
 * @param parentElement
 */
export function render(component: Component, parentElement) {
  parentElement.appendChild(component.root);
}


/**
 * Mini React 实现
 */
export default class MiniReact {
  static createElement = createElement;
  static render = render;
  static Component = Component;
}



/**
 * ==================================Utils 方法==================================
 */


/**
 * 递归的检查、插入children
 * @param el
 * @param children
 */
function insertChildren(el, children) {
  // 针对js的解析规范设置的
  for (let child of children) {
    if (typeof child === 'string') {
      child = new TextWrapper(child);
    }
    // 如果传入了一个数组，则递归的去解析数组
    if (typeof child === 'object' && child instanceof Array) {
      insertChildren(el, child);
    } else {
      // 否则直接插入即可
      el.appendChild(child);
    }
  }
}
