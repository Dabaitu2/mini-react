import MiniReact from '../MiniReact';

class MyComponent extends MiniReact.Component {
  constructor() {
    super();
    this.state = {
      a: 1,
      b: 2,
    };
  }

  render() {
    return (
      <div id="a" className="b">
        <h2>hello Mini-React</h2>
        <button
          onclick={() => {
            this.setState({
              a: this.state.a + 1,
            });
          }}
        >
          add
        </button>
        <div>{this.state.a.toString()}</div>
        <div>{this.state.b.toString()}</div>
        {this.children}
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
