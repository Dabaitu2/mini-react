import { Component, TextWrapper } from './mini-react';

export function insertChildren(el: Component, children: any[]) {
  for (let child of children) {
    if (typeof child === 'string') {
      child = new TextWrapper(child);
    }
    if (child === null) {
      continue;
    }
    // 存在this.props.children的情况下，就需要再打平一层
    if (typeof child === 'object' && child instanceof Array) {
      insertChildren(el, child);
    } else {
      el.appendChild(child);
    }
  }
}

export function replaceContent(range: Range, node) {
  range.insertNode(node);
  range.setStartAfter(node);
  range.deleteContents();
  range.setStartBefore(node);
  range.setEndAfter(node);
}

export function isSameNode(oldNode, newNode) {
  if (oldNode.type !== newNode.type) {
    return false;
  }
  for (let name in newNode.props) {
    if (newNode.props[name] !== oldNode.props[name]) {
      return false;
    }
  }
  if (Object.keys(oldNode.props).length > Object.keys(newNode.props).length) {
    return false;
  }
  if (isTextWrapper(newNode)) {
    if (newNode.content !== oldNode.content) {
      return false;
    }
  }
  return true;
}
export function isTextWrapper(node: any): node is TextWrapper {
  return node.type === '#text';
}
