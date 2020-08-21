import MiniReact from './mini-react';

class MyComponent extends MiniReact.Component {
  constructor() {
    super();
    this.state = {
      a: 1,
      b: 2
    };
  }

  render() {
    return (
      <div id="a" className="b">
        <h2>hello Mini-React</h2>
        {this.children}
        <div>{this.state.a.toString()}</div>
      </div>
    );
  }
}

MiniReact.render(
  <MyComponent>
    <div>abc</div>
    <div>def</div>
  </MyComponent>,
  document.getElementById('app')
);
