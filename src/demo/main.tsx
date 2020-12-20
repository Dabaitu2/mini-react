import MiniReact from '../MiniReact';
// import * as Sentry from '@sentry/browser';
// import { Integrations } from '@sentry/tracing';

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

// Sentry.init({
//   dsn:
//     'https://8ae9c14557924406a5ef0f39c821468d@o488522.ingest.sentry.io/5551875',
//   integrations: [new Integrations.BrowserTracing()],
//
//   tracesSampleRate: 1.0,
// });

setTimeout(() => {
  // @ts-ignore
  myUndefinedFunction();
}, 4000);

// ABC. DEF 两个子元素通过 createELement(MyComponenet, null, ...)
// 被 appendChild到MyCommponent的 this.children 去了
// 而this.children 就可以在 render 的时候用到了
// 不一定针灸被用到
MiniReact.render(
  <MyComponent>
    <div>abc</div>
    <div>def</div>
  </MyComponent>,
  document.getElementById('app')
);
