import { Component } from './mini-react';
import { isSameNode } from './utils';

export const RENDER_DOM = Symbol('render to dom');

export function render(component: Component, parentElement) {
  let range = document.createRange();
  range.setStart(parentElement, 0);
  range.setEnd(parentElement, parentElement.childNodes.length);
  range.deleteContents();
  component[RENDER_DOM](range);
}

export function update(oldNode, newNode) {
  // 实际的更新过程渲染 1
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

  // 尾部range就是oldChildren的最后一个range
  let tailRange = oldChildren[oldChildren.length - 1].range;

  for (let i = 0; i < newChildren.length; i++) {
    // 前几个children 挨个做更新
    let newChild = newChildren[i];
    let oldChild = oldChildren[i];
    if (i < oldChildren.length) {
      update(oldChild, newChild);
    } else {
      // 如果新children 数量 > 老children 则直接追加在队尾了
      let range = document.createRange();
      range.setStart(tailRange.endContainer, tailRange.endOffset);
      range.setEnd(tailRange.endContainer, tailRange.endOffset);
      // 实际的更新过程渲染 1
      newChild[RENDER_DOM](range);
      tailRange = range;
    }
  }
}
