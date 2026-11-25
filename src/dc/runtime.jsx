// A small runtime that lets each screen keep the shape it had on the design canvas:
// a logic class (state + renderVals) and a template function that renders those values.
import { Component } from 'react';

// Base class for every screen's logic. State updates merge immediately (so code can read
// this.state right after setState), then the React host re-renders.
export class DCLogic {
  constructor(props) {
    this.props = props || {};
    this.state = {};
    this.__host = null;
  }
  setState(patch, cb) {
    const prev = this.state;
    const next = typeof patch === 'function' ? patch(prev) : patch;
    this.state = { ...prev, ...(next || {}) };
    if (this.__host) this.__host.bump(cb);
  }
  forceUpdate(cb) {
    if (this.__host) this.__host.bump(cb);
  }
  componentDidMount() {}
  componentDidUpdate() {}
  componentWillUnmount() {}
  renderVals() {
    return {};
  }
}

// Lists in templates: anything that is not an array renders nothing.
export function asList(x) {
  return Array.isArray(x) ? x : [];
}

// Wraps a logic class + template function into a React component.
export function makeScreen(name, Logic, render) {
  class Screen extends Component {
    constructor(props) {
      super(props);
      this.state = { v: 0 };
      this.logic = new Logic(props);
      this.logic.__host = this;
    }
    bump(cb) {
      if (this.__gone) return;
      this.setState((s) => ({ v: s.v + 1 }), cb);
    }
    componentDidMount() {
      this.logic.props = this.props;
      try { this.logic.componentDidMount(); } catch (e) { console.error(`[${name}] componentDidMount`, e); }
    }
    componentDidUpdate(prevProps) {
      this.logic.props = this.props;
      try { this.logic.componentDidUpdate(prevProps); } catch (e) { console.error(`[${name}] componentDidUpdate`, e); }
    }
    componentWillUnmount() {
      this.__gone = true;
      try { this.logic.componentWillUnmount(); } catch (e) { console.error(`[${name}] componentWillUnmount`, e); }
    }
    render() {
      this.logic.props = this.props;
      let vals = this.props;
      try {
        vals = { ...this.props, ...(this.logic.renderVals() || {}) };
      } catch (e) {
        console.error(`[${name}] renderVals`, e);
      }
      return <div data-screen={name}>{render(vals)}</div>;
    }
  }
  Screen.displayName = name;
  return Screen;
}
