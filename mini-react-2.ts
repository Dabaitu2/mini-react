/**
 * 其实我感觉这个文件应该叫MiniReactDOM...
 */

/**
 * tips: 在没有#或者private字段的情况下，可以使用Symbol来模拟私有变量
 * 比如 const RENDER_DOM = symbol('render to dom');
 * class A {
 *   [RENDER_DOM](xx) {
 *     // ...
 *   }
 * }
 * 只要不将symbol暴露出去，其他人（在不清楚symbolFor的情况下）就无法调用实例上的这个方法了
 * @private
 */
const RENDER_DOM = Symbol('render to dom');

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
    if (name.match(/^on([\s\S]+)$/)) {
      // 处理所有的事件监听
      this.root.addEventListener(
        RegExp.$1.replace(/^[\s\S]/, c => c.toLowerCase()),
        value
      );
    }
    if (name === 'className') {
      this.root.setAttribute('class', value);
    } else {
      this.root.setAttribute(name, value);
    }
  }

  appendChild(component) {
    // 创建当前待渲染节点父节点的全部字节点作为待查找和更新的range
    // 只有实dom才有真正创造range和appendChild的能力
    let range = document.createRange();
    // range的范围实际上是最后，不会损伤前面的dom元素
    range.setStart(this.root, this.root.childNodes.length);
    range.setEnd(this.root, this.root.childNodes.length);
    component[RENDER_DOM](range);
  }

  /**
   * 这个range是父组件做的事
   * 清除的是当前元素最初所占据的位置（就一个位置，childNodes.length， appendChild创建的那个range，虽然对于创建时是最后一个位置）
   * 但在一次完整渲染结束后就可能在中间了
   * （通过range定位到的)
   * @param range
   */
  [RENDER_DOM](range: Range) {
    range.deleteContents();
    range.insertNode(this.root);
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
  [RENDER_DOM](range: Range) {
    range.deleteContents();
    range.insertNode(this.root);
  }
}

/**
 * 用户自己定义的组件依然要具有被createElement解析的能力
 * 所以React要求自定义class组件都要继承一个Component类，这样可以帮忙注入一些解析时需要的默认实现
 * 在react中，自定义的控件的"attribute"实际上会被叫做"props"。 在这里沿用这个名字
 */
abstract class Component {
  // 子类可以使用
  protected props;
  protected state;
  protected children;

  // 一些内部机制，并不需要对子类暴露细节
  private root;
  private range;

  protected constructor() {
    // 这个操作可以保证该变量是绝对空的，不会通过forin找到原型链上的方法
    // 从而在forin时不用做额外的hasOwnProperty判断从而损伤性能
    this.props = Object.create({});
    this.children = [];
    // 自定义的root实际是什么需要在render方法里实现, 有可能是ElementWrapper，也可能是另一个Component
    this.root = null;
    this.range = null;
  }

  setAttribute(name, value) {
    this.props[name] = value;
  }

  appendChild(component) {
    this.children.push(component);
  }

  /**
   * 我们在更新元素时，遇到的可能时处在中间的元素，不能再使用append或者push这样的操作来更新了，
   * 所以需要使用rangeApi来获取准确的dom位置。
   * 不用private是因为在这个文件里面我们还是需要调用这个实例方法的，使用private就完全不能用了
   * 对于component类, range对象是被透传的过来的，因为他本身无法创建真正的range，需要使用某一个实dom创建的range
   * @param range
   */
  [RENDER_DOM](range) {
    this.range = range;
    this.render()[RENDER_DOM](range);
  }
  /**
   * render 必须要由用户实现
   * 可以返回一个包装后的HTMLElement
   * 也可以返回一个子组件
   * （返回的本来是jsx，被babel转译成了createElement(xxx),再解析成相应组件）
   * 如果遇到了子组件(Component)，调用root的时候，还需要递归解析
   */
  abstract render(): ElementWrapper | Component;

  /**
   * 手动的触发重渲染
   * 只有自定义的component才有这个能力
   * 重渲染的步骤：
   * 1, 清除当前component占据的range重的内容
   * 2, 重新渲染当前range中的元素，这个时候会使用到新的state值
   * @protected
   */
  protected rerender() {
    this.range.deleteContents();
    this[RENDER_DOM](this.range);
  }

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
      // 只要oldState中不存在当前元素，且oldState[p] 不是object，就可以直接赋值，否则还需要递归到下一层
      if (oldState[p] === null || typeof oldState[p] !== 'object') {
        oldState[p] = newState[p];
      } else {
        this.merge(oldState[p], newState[p]);
      }
    }
  }
}

/**
 * 文本节点不会出现在type位置
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
 * 可以更新的render就需要考虑位置了
 * @param component
 * @param parentElement
 */
export function render(component: Component, parentElement) {
  // 创建当前待渲染节点父节点的全部字节点作为待查找和更新的range
  let range = document.createRange();
  range.setStart(parentElement, 0);
  range.setEnd(parentElement, parentElement.childNodes.length);
  // 清空该range中的全部内容
  range.deleteContents();
  component[RENDER_DOM](range);
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
    if (child === null) {
      continue;
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
