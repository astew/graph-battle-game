export function createElement(type, props, ...children) {
  return { type, props: props || {}, children };
}

export const StrictMode = ({ children }) => children;

export default {
  createElement,
  StrictMode,
};
