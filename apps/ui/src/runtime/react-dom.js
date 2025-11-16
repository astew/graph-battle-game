function createDomNode(vnode) {
  if (vnode == null) {
    return document.createTextNode('');
  }

  if (typeof vnode === 'string') {
    return document.createTextNode(vnode);
  }

  if (typeof vnode.type === 'function') {
    const rendered = vnode.type({ ...(vnode.props || {}), children: vnode.children });
    return createDomNode(rendered);
  }

  const { type, props, children } = vnode;
  const element = document.createElement(type);

  for (const [key, value] of Object.entries(props || {})) {
    if (key === 'className') {
      element.setAttribute('class', value);
    } else if (key.startsWith('on') && typeof value === 'function') {
      element.addEventListener(key.slice(2).toLowerCase(), value);
    } else {
      element.setAttribute(key, value);
    }
  }

  for (const child of children || []) {
    element.appendChild(createDomNode(child));
  }

  return element;
}

function createRoot(container) {
  return {
    render(node) {
      container.innerHTML = '';
      const tree = Array.isArray(node) ? node : [node];
      for (const child of tree) {
        container.appendChild(createDomNode(child));
      }
    },
  };
}

module.exports = {
  createRoot,
};
