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
      range.setStart(tailRange.endContainer, tailRange.endOffset);
      range.setEnd(tailRange.endContainer, tailRange.endOffset);
      newChild[RENDER_DOM](range);
      tailRange = range;
    }
  }
}
