function createElement(type, props, ...children) {
  return { type, props: props || {}, children }; 
}

const StrictMode = ({ children }) => children;

module.exports = {
  createElement,
  StrictMode,
};
