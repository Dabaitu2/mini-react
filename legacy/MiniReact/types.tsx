import { Component, ElementWrapper } from './mini-react';

export interface FC<P = {}> {
  (props: P): typeof ElementWrapper | typeof Component | FC<any>;
}
const MyComponent: FC<{b: string}> = () => {
  return <div>hello</div>
}
const a:FC<{}> = () => {
  return <MyComponent b={'string'}>hello</MyComponent>
}
