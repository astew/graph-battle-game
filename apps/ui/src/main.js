const React = require('./runtime/react');
const ReactDOM = require('./runtime/react-dom');
const App = require('./App');

function start() {
  const container = document.getElementById('root');
  if (!container) {
    throw new Error('Expected #root container to exist');
  }

  const root = ReactDOM.createRoot(container);
  root.render(React.createElement(React.StrictMode, null, React.createElement(App)));
}

if (typeof document !== 'undefined') {
  start();
}

module.exports = {
  start,
};
