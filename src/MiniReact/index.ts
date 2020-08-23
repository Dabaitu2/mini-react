import { Component, createElement } from './mini-react';
import { render } from './dom';

export * from './dom';
export * from './mini-react';
export default class MiniReact {
  static createElement = createElement;
  static render = render;
  static Component = Component;
}
