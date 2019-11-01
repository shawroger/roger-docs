
(function(l, r) { if (l.getElementById('livereloadscript')) return; r = l.createElement('script'); r.async = 1; r.src = '//' + (window.location.host || 'localhost').split(':')[0] + ':35729/livereload.js?snipver=1'; r.id = 'livereloadscript'; l.head.appendChild(r) })(window.document);
var app = (function () {
    'use strict';

    function noop() { }
    const identity = x => x;
    function assign(tar, src) {
        // @ts-ignore
        for (const k in src)
            tar[k] = src[k];
        return tar;
    }
    function add_location(element, file, line, column, char) {
        element.__svelte_meta = {
            loc: { file, line, column, char }
        };
    }
    function run(fn) {
        return fn();
    }
    function blank_object() {
        return Object.create(null);
    }
    function run_all(fns) {
        fns.forEach(run);
    }
    function is_function(thing) {
        return typeof thing === 'function';
    }
    function safe_not_equal(a, b) {
        return a != a ? b == b : a !== b || ((a && typeof a === 'object') || typeof a === 'function');
    }
    function validate_store(store, name) {
        if (!store || typeof store.subscribe !== 'function') {
            throw new Error(`'${name}' is not a store with a 'subscribe' method`);
        }
    }
    function subscribe(store, callback) {
        const unsub = store.subscribe(callback);
        return unsub.unsubscribe ? () => unsub.unsubscribe() : unsub;
    }
    function component_subscribe(component, store, callback) {
        component.$$.on_destroy.push(subscribe(store, callback));
    }
    function create_slot(definition, ctx, fn) {
        if (definition) {
            const slot_ctx = get_slot_context(definition, ctx, fn);
            return definition[0](slot_ctx);
        }
    }
    function get_slot_context(definition, ctx, fn) {
        return definition[1]
            ? assign({}, assign(ctx.$$scope.ctx, definition[1](fn ? fn(ctx) : {})))
            : ctx.$$scope.ctx;
    }
    function get_slot_changes(definition, ctx, changed, fn) {
        return definition[1]
            ? assign({}, assign(ctx.$$scope.changed || {}, definition[1](fn ? fn(changed) : {})))
            : ctx.$$scope.changed || {};
    }
    function exclude_internal_props(props) {
        const result = {};
        for (const k in props)
            if (k[0] !== '$')
                result[k] = props[k];
        return result;
    }

    const is_client = typeof window !== 'undefined';
    let now = is_client
        ? () => window.performance.now()
        : () => Date.now();
    let raf = is_client ? cb => requestAnimationFrame(cb) : noop;

    const tasks = new Set();
    let running = false;
    function run_tasks() {
        tasks.forEach(task => {
            if (!task[0](now())) {
                tasks.delete(task);
                task[1]();
            }
        });
        running = tasks.size > 0;
        if (running)
            raf(run_tasks);
    }
    function loop(fn) {
        let task;
        if (!running) {
            running = true;
            raf(run_tasks);
        }
        return {
            promise: new Promise(fulfil => {
                tasks.add(task = [fn, fulfil]);
            }),
            abort() {
                tasks.delete(task);
            }
        };
    }

    function append(target, node) {
        target.appendChild(node);
    }
    function insert(target, node, anchor) {
        target.insertBefore(node, anchor || null);
    }
    function detach(node) {
        node.parentNode.removeChild(node);
    }
    function destroy_each(iterations, detaching) {
        for (let i = 0; i < iterations.length; i += 1) {
            if (iterations[i])
                iterations[i].d(detaching);
        }
    }
    function element(name) {
        return document.createElement(name);
    }
    function text(data) {
        return document.createTextNode(data);
    }
    function space() {
        return text(' ');
    }
    function empty() {
        return text('');
    }
    function listen(node, event, handler, options) {
        node.addEventListener(event, handler, options);
        return () => node.removeEventListener(event, handler, options);
    }
    function attr(node, attribute, value) {
        if (value == null)
            node.removeAttribute(attribute);
        else
            node.setAttribute(attribute, value);
    }
    function set_attributes(node, attributes) {
        for (const key in attributes) {
            if (key === 'style') {
                node.style.cssText = attributes[key];
            }
            else if (key in node) {
                node[key] = attributes[key];
            }
            else {
                attr(node, key, attributes[key]);
            }
        }
    }
    function children(element) {
        return Array.from(element.childNodes);
    }
    function set_input_value(input, value) {
        if (value != null || input.value) {
            input.value = value;
        }
    }
    function set_style(node, key, value, important) {
        node.style.setProperty(key, value, important ? 'important' : '');
    }
    function add_resize_listener(element, fn) {
        if (getComputedStyle(element).position === 'static') {
            element.style.position = 'relative';
        }
        const object = document.createElement('object');
        object.setAttribute('style', 'display: block; position: absolute; top: 0; left: 0; height: 100%; width: 100%; overflow: hidden; pointer-events: none; z-index: -1;');
        object.type = 'text/html';
        object.tabIndex = -1;
        let win;
        object.onload = () => {
            win = object.contentDocument.defaultView;
            win.addEventListener('resize', fn);
        };
        if (/Trident/.test(navigator.userAgent)) {
            element.appendChild(object);
            object.data = 'about:blank';
        }
        else {
            object.data = 'about:blank';
            element.appendChild(object);
        }
        return {
            cancel: () => {
                win && win.removeEventListener && win.removeEventListener('resize', fn);
                element.removeChild(object);
            }
        };
    }
    function custom_event(type, detail) {
        const e = document.createEvent('CustomEvent');
        e.initCustomEvent(type, false, false, detail);
        return e;
    }

    let stylesheet;
    let active = 0;
    let current_rules = {};
    // https://github.com/darkskyapp/string-hash/blob/master/index.js
    function hash(str) {
        let hash = 5381;
        let i = str.length;
        while (i--)
            hash = ((hash << 5) - hash) ^ str.charCodeAt(i);
        return hash >>> 0;
    }
    function create_rule(node, a, b, duration, delay, ease, fn, uid = 0) {
        const step = 16.666 / duration;
        let keyframes = '{\n';
        for (let p = 0; p <= 1; p += step) {
            const t = a + (b - a) * ease(p);
            keyframes += p * 100 + `%{${fn(t, 1 - t)}}\n`;
        }
        const rule = keyframes + `100% {${fn(b, 1 - b)}}\n}`;
        const name = `__svelte_${hash(rule)}_${uid}`;
        if (!current_rules[name]) {
            if (!stylesheet) {
                const style = element('style');
                document.head.appendChild(style);
                stylesheet = style.sheet;
            }
            current_rules[name] = true;
            stylesheet.insertRule(`@keyframes ${name} ${rule}`, stylesheet.cssRules.length);
        }
        const animation = node.style.animation || '';
        node.style.animation = `${animation ? `${animation}, ` : ``}${name} ${duration}ms linear ${delay}ms 1 both`;
        active += 1;
        return name;
    }
    function delete_rule(node, name) {
        node.style.animation = (node.style.animation || '')
            .split(', ')
            .filter(name
            ? anim => anim.indexOf(name) < 0 // remove specific animation
            : anim => anim.indexOf('__svelte') === -1 // remove all Svelte animations
        )
            .join(', ');
        if (name && !--active)
            clear_rules();
    }
    function clear_rules() {
        raf(() => {
            if (active)
                return;
            let i = stylesheet.cssRules.length;
            while (i--)
                stylesheet.deleteRule(i);
            current_rules = {};
        });
    }

    let current_component;
    function set_current_component(component) {
        current_component = component;
    }
    function get_current_component() {
        if (!current_component)
            throw new Error(`Function called outside component initialization`);
        return current_component;
    }
    function onMount(fn) {
        get_current_component().$$.on_mount.push(fn);
    }
    function onDestroy(fn) {
        get_current_component().$$.on_destroy.push(fn);
    }
    function createEventDispatcher() {
        const component = current_component;
        return (type, detail) => {
            const callbacks = component.$$.callbacks[type];
            if (callbacks) {
                // TODO are there situations where events could be dispatched
                // in a server (non-DOM) environment?
                const event = custom_event(type, detail);
                callbacks.slice().forEach(fn => {
                    fn.call(component, event);
                });
            }
        };
    }
    function setContext(key, context) {
        get_current_component().$$.context.set(key, context);
    }
    function getContext(key) {
        return get_current_component().$$.context.get(key);
    }
    // TODO figure out if we still want to support
    // shorthand events, or if we want to implement
    // a real bubbling mechanism
    function bubble(component, event) {
        const callbacks = component.$$.callbacks[event.type];
        if (callbacks) {
            callbacks.slice().forEach(fn => fn(event));
        }
    }

    const dirty_components = [];
    const binding_callbacks = [];
    const render_callbacks = [];
    const flush_callbacks = [];
    const resolved_promise = Promise.resolve();
    let update_scheduled = false;
    function schedule_update() {
        if (!update_scheduled) {
            update_scheduled = true;
            resolved_promise.then(flush);
        }
    }
    function add_render_callback(fn) {
        render_callbacks.push(fn);
    }
    function flush() {
        const seen_callbacks = new Set();
        do {
            // first, call beforeUpdate functions
            // and update components
            while (dirty_components.length) {
                const component = dirty_components.shift();
                set_current_component(component);
                update(component.$$);
            }
            while (binding_callbacks.length)
                binding_callbacks.pop()();
            // then, once components are updated, call
            // afterUpdate functions. This may cause
            // subsequent updates...
            for (let i = 0; i < render_callbacks.length; i += 1) {
                const callback = render_callbacks[i];
                if (!seen_callbacks.has(callback)) {
                    callback();
                    // ...so guard against infinite loops
                    seen_callbacks.add(callback);
                }
            }
            render_callbacks.length = 0;
        } while (dirty_components.length);
        while (flush_callbacks.length) {
            flush_callbacks.pop()();
        }
        update_scheduled = false;
    }
    function update($$) {
        if ($$.fragment) {
            $$.update($$.dirty);
            run_all($$.before_update);
            $$.fragment.p($$.dirty, $$.ctx);
            $$.dirty = null;
            $$.after_update.forEach(add_render_callback);
        }
    }

    let promise;
    function wait() {
        if (!promise) {
            promise = Promise.resolve();
            promise.then(() => {
                promise = null;
            });
        }
        return promise;
    }
    function dispatch(node, direction, kind) {
        node.dispatchEvent(custom_event(`${direction ? 'intro' : 'outro'}${kind}`));
    }
    const outroing = new Set();
    let outros;
    function group_outros() {
        outros = {
            r: 0,
            c: [],
            p: outros // parent group
        };
    }
    function check_outros() {
        if (!outros.r) {
            run_all(outros.c);
        }
        outros = outros.p;
    }
    function transition_in(block, local) {
        if (block && block.i) {
            outroing.delete(block);
            block.i(local);
        }
    }
    function transition_out(block, local, detach, callback) {
        if (block && block.o) {
            if (outroing.has(block))
                return;
            outroing.add(block);
            outros.c.push(() => {
                outroing.delete(block);
                if (callback) {
                    if (detach)
                        block.d(1);
                    callback();
                }
            });
            block.o(local);
        }
    }
    const null_transition = { duration: 0 };
    function create_bidirectional_transition(node, fn, params, intro) {
        let config = fn(node, params);
        let t = intro ? 0 : 1;
        let running_program = null;
        let pending_program = null;
        let animation_name = null;
        function clear_animation() {
            if (animation_name)
                delete_rule(node, animation_name);
        }
        function init(program, duration) {
            const d = program.b - t;
            duration *= Math.abs(d);
            return {
                a: t,
                b: program.b,
                d,
                duration,
                start: program.start,
                end: program.start + duration,
                group: program.group
            };
        }
        function go(b) {
            const { delay = 0, duration = 300, easing = identity, tick = noop, css } = config || null_transition;
            const program = {
                start: now() + delay,
                b
            };
            if (!b) {
                // @ts-ignore todo: improve typings
                program.group = outros;
                outros.r += 1;
            }
            if (running_program) {
                pending_program = program;
            }
            else {
                // if this is an intro, and there's a delay, we need to do
                // an initial tick and/or apply CSS animation immediately
                if (css) {
                    clear_animation();
                    animation_name = create_rule(node, t, b, duration, delay, easing, css);
                }
                if (b)
                    tick(0, 1);
                running_program = init(program, duration);
                add_render_callback(() => dispatch(node, b, 'start'));
                loop(now => {
                    if (pending_program && now > pending_program.start) {
                        running_program = init(pending_program, duration);
                        pending_program = null;
                        dispatch(node, running_program.b, 'start');
                        if (css) {
                            clear_animation();
                            animation_name = create_rule(node, t, running_program.b, running_program.duration, 0, easing, config.css);
                        }
                    }
                    if (running_program) {
                        if (now >= running_program.end) {
                            tick(t = running_program.b, 1 - t);
                            dispatch(node, running_program.b, 'end');
                            if (!pending_program) {
                                // we're done
                                if (running_program.b) {
                                    // intro — we can tidy up immediately
                                    clear_animation();
                                }
                                else {
                                    // outro — needs to be coordinated
                                    if (!--running_program.group.r)
                                        run_all(running_program.group.c);
                                }
                            }
                            running_program = null;
                        }
                        else if (now >= running_program.start) {
                            const p = now - running_program.start;
                            t = running_program.a + running_program.d * easing(p / running_program.duration);
                            tick(t, 1 - t);
                        }
                    }
                    return !!(running_program || pending_program);
                });
            }
        }
        return {
            run(b) {
                if (is_function(config)) {
                    wait().then(() => {
                        // @ts-ignore
                        config = config();
                        go(b);
                    });
                }
                else {
                    go(b);
                }
            },
            end() {
                clear_animation();
                running_program = pending_program = null;
            }
        };
    }

    const globals = (typeof window !== 'undefined' ? window : global);

    function get_spread_update(levels, updates) {
        const update = {};
        const to_null_out = {};
        const accounted_for = { $$scope: 1 };
        let i = levels.length;
        while (i--) {
            const o = levels[i];
            const n = updates[i];
            if (n) {
                for (const key in o) {
                    if (!(key in n))
                        to_null_out[key] = 1;
                }
                for (const key in n) {
                    if (!accounted_for[key]) {
                        update[key] = n[key];
                        accounted_for[key] = 1;
                    }
                }
                levels[i] = n;
            }
            else {
                for (const key in o) {
                    accounted_for[key] = 1;
                }
            }
        }
        for (const key in to_null_out) {
            if (!(key in update))
                update[key] = undefined;
        }
        return update;
    }
    function get_spread_object(spread_props) {
        return typeof spread_props === 'object' && spread_props !== null ? spread_props : {};
    }
    function mount_component(component, target, anchor) {
        const { fragment, on_mount, on_destroy, after_update } = component.$$;
        fragment.m(target, anchor);
        // onMount happens before the initial afterUpdate
        add_render_callback(() => {
            const new_on_destroy = on_mount.map(run).filter(is_function);
            if (on_destroy) {
                on_destroy.push(...new_on_destroy);
            }
            else {
                // Edge case - component was destroyed immediately,
                // most likely as a result of a binding initialising
                run_all(new_on_destroy);
            }
            component.$$.on_mount = [];
        });
        after_update.forEach(add_render_callback);
    }
    function destroy_component(component, detaching) {
        if (component.$$.fragment) {
            run_all(component.$$.on_destroy);
            component.$$.fragment.d(detaching);
            // TODO null out other refs, including component.$$ (but need to
            // preserve final state?)
            component.$$.on_destroy = component.$$.fragment = null;
            component.$$.ctx = {};
        }
    }
    function make_dirty(component, key) {
        if (!component.$$.dirty) {
            dirty_components.push(component);
            schedule_update();
            component.$$.dirty = blank_object();
        }
        component.$$.dirty[key] = true;
    }
    function init(component, options, instance, create_fragment, not_equal, prop_names) {
        const parent_component = current_component;
        set_current_component(component);
        const props = options.props || {};
        const $$ = component.$$ = {
            fragment: null,
            ctx: null,
            // state
            props: prop_names,
            update: noop,
            not_equal,
            bound: blank_object(),
            // lifecycle
            on_mount: [],
            on_destroy: [],
            before_update: [],
            after_update: [],
            context: new Map(parent_component ? parent_component.$$.context : []),
            // everything else
            callbacks: blank_object(),
            dirty: null
        };
        let ready = false;
        $$.ctx = instance
            ? instance(component, props, (key, ret, value = ret) => {
                if ($$.ctx && not_equal($$.ctx[key], $$.ctx[key] = value)) {
                    if ($$.bound[key])
                        $$.bound[key](value);
                    if (ready)
                        make_dirty(component, key);
                }
                return ret;
            })
            : props;
        $$.update();
        ready = true;
        run_all($$.before_update);
        $$.fragment = create_fragment($$.ctx);
        if (options.target) {
            if (options.hydrate) {
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                $$.fragment.l(children(options.target));
            }
            else {
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                $$.fragment.c();
            }
            if (options.intro)
                transition_in(component.$$.fragment);
            mount_component(component, options.target, options.anchor);
            flush();
        }
        set_current_component(parent_component);
    }
    class SvelteComponent {
        $destroy() {
            destroy_component(this, 1);
            this.$destroy = noop;
        }
        $on(type, callback) {
            const callbacks = (this.$$.callbacks[type] || (this.$$.callbacks[type] = []));
            callbacks.push(callback);
            return () => {
                const index = callbacks.indexOf(callback);
                if (index !== -1)
                    callbacks.splice(index, 1);
            };
        }
        $set() {
            // overridden by instance, if it has props
        }
    }

    function dispatch_dev(type, detail) {
        document.dispatchEvent(custom_event(type, detail));
    }
    function append_dev(target, node) {
        dispatch_dev("SvelteDOMInsert", { target, node });
        append(target, node);
    }
    function insert_dev(target, node, anchor) {
        dispatch_dev("SvelteDOMInsert", { target, node, anchor });
        insert(target, node, anchor);
    }
    function detach_dev(node) {
        dispatch_dev("SvelteDOMRemove", { node });
        detach(node);
    }
    function listen_dev(node, event, handler, options, has_prevent_default, has_stop_propagation) {
        const modifiers = options === true ? ["capture"] : options ? Array.from(Object.keys(options)) : [];
        if (has_prevent_default)
            modifiers.push('preventDefault');
        if (has_stop_propagation)
            modifiers.push('stopPropagation');
        dispatch_dev("SvelteDOMAddEventListener", { node, event, handler, modifiers });
        const dispose = listen(node, event, handler, options);
        return () => {
            dispatch_dev("SvelteDOMRemoveEventListener", { node, event, handler, modifiers });
            dispose();
        };
    }
    function attr_dev(node, attribute, value) {
        attr(node, attribute, value);
        if (value == null)
            dispatch_dev("SvelteDOMRemoveAttribute", { node, attribute });
        else
            dispatch_dev("SvelteDOMSetAttribute", { node, attribute, value });
    }
    function set_data_dev(text, data) {
        data = '' + data;
        if (text.data === data)
            return;
        dispatch_dev("SvelteDOMSetData", { node: text, data });
        text.data = data;
    }
    class SvelteComponentDev extends SvelteComponent {
        constructor(options) {
            if (!options || (!options.target && !options.$$inline)) {
                throw new Error(`'target' is a required option`);
            }
            super();
        }
        $destroy() {
            super.$destroy();
            this.$destroy = () => {
                console.warn(`Component was already destroyed`); // eslint-disable-line no-console
            };
        }
    }

    const subscriber_queue = [];
    /**
     * Creates a `Readable` store that allows reading by subscription.
     * @param value initial value
     * @param {StartStopNotifier}start start and stop notifications for subscriptions
     */
    function readable(value, start) {
        return {
            subscribe: writable(value, start).subscribe,
        };
    }
    /**
     * Create a `Writable` store that allows both updating and reading by subscription.
     * @param {*=}value initial value
     * @param {StartStopNotifier=}start start and stop notifications for subscriptions
     */
    function writable(value, start = noop) {
        let stop;
        const subscribers = [];
        function set(new_value) {
            if (safe_not_equal(value, new_value)) {
                value = new_value;
                if (stop) { // store is ready
                    const run_queue = !subscriber_queue.length;
                    for (let i = 0; i < subscribers.length; i += 1) {
                        const s = subscribers[i];
                        s[1]();
                        subscriber_queue.push(s, value);
                    }
                    if (run_queue) {
                        for (let i = 0; i < subscriber_queue.length; i += 2) {
                            subscriber_queue[i][0](subscriber_queue[i + 1]);
                        }
                        subscriber_queue.length = 0;
                    }
                }
            }
        }
        function update(fn) {
            set(fn(value));
        }
        function subscribe(run, invalidate = noop) {
            const subscriber = [run, invalidate];
            subscribers.push(subscriber);
            if (subscribers.length === 1) {
                stop = start(set) || noop;
            }
            run(value);
            return () => {
                const index = subscribers.indexOf(subscriber);
                if (index !== -1) {
                    subscribers.splice(index, 1);
                }
                if (subscribers.length === 0) {
                    stop();
                    stop = null;
                }
            };
        }
        return { set, update, subscribe };
    }
    /**
     * Derived value store by synchronizing one or more readable stores and
     * applying an aggregation function over its input values.
     * @param {Stores} stores input stores
     * @param {function(Stores=, function(*)=):*}fn function callback that aggregates the values
     * @param {*=}initial_value when used asynchronously
     */
    function derived(stores, fn, initial_value) {
        const single = !Array.isArray(stores);
        const stores_array = single
            ? [stores]
            : stores;
        const auto = fn.length < 2;
        return readable(initial_value, (set) => {
            let inited = false;
            const values = [];
            let pending = 0;
            let cleanup = noop;
            const sync = () => {
                if (pending) {
                    return;
                }
                cleanup();
                const result = fn(single ? values[0] : values, set);
                if (auto) {
                    set(result);
                }
                else {
                    cleanup = is_function(result) ? result : noop;
                }
            };
            const unsubscribers = stores_array.map((store, i) => store.subscribe((value) => {
                values[i] = value;
                pending &= ~(1 << i);
                if (inited) {
                    sync();
                }
            }, () => {
                pending |= (1 << i);
            }));
            inited = true;
            sync();
            return function stop() {
                run_all(unsubscribers);
                cleanup();
            };
        });
    }

    const LOCATION = {};
    const ROUTER = {};

    /**
     * Adapted from https://github.com/reach/router/blob/b60e6dd781d5d3a4bdaaf4de665649c0f6a7e78d/src/lib/history.js
     *
     * https://github.com/reach/router/blob/master/LICENSE
     * */

    function getLocation(source) {
      return {
        ...source.location,
        state: source.history.state,
        key: (source.history.state && source.history.state.key) || "initial"
      };
    }

    function createHistory(source, options) {
      const listeners = [];
      let location = getLocation(source);

      return {
        get location() {
          return location;
        },

        listen(listener) {
          listeners.push(listener);

          const popstateListener = () => {
            location = getLocation(source);
            listener({ location, action: "POP" });
          };

          source.addEventListener("popstate", popstateListener);

          return () => {
            source.removeEventListener("popstate", popstateListener);

            const index = listeners.indexOf(listener);
            listeners.splice(index, 1);
          };
        },

        navigate(to, { state, replace = false } = {}) {
          state = { ...state, key: Date.now() + "" };
          // try...catch iOS Safari limits to 100 pushState calls
          try {
            if (replace) {
              source.history.replaceState(state, null, to);
            } else {
              source.history.pushState(state, null, to);
            }
          } catch (e) {
            source.location[replace ? "replace" : "assign"](to);
          }

          location = getLocation(source);
          listeners.forEach(listener => listener({ location, action: "PUSH" }));
        }
      };
    }

    // Stores history entries in memory for testing or other platforms like Native
    function createMemorySource(initialPathname = "/") {
      let index = 0;
      const stack = [{ pathname: initialPathname, search: "" }];
      const states = [];

      return {
        get location() {
          return stack[index];
        },
        addEventListener(name, fn) {},
        removeEventListener(name, fn) {},
        history: {
          get entries() {
            return stack;
          },
          get index() {
            return index;
          },
          get state() {
            return states[index];
          },
          pushState(state, _, uri) {
            const [pathname, search = ""] = uri.split("?");
            index++;
            stack.push({ pathname, search });
            states.push(state);
          },
          replaceState(state, _, uri) {
            const [pathname, search = ""] = uri.split("?");
            stack[index] = { pathname, search };
            states[index] = state;
          }
        }
      };
    }

    // Global history uses window.history as the source if available,
    // otherwise a memory history
    const canUseDOM = Boolean(
      typeof window !== "undefined" &&
        window.document &&
        window.document.createElement
    );
    const globalHistory = createHistory(canUseDOM ? window : createMemorySource());
    const { navigate } = globalHistory;

    /**
     * Adapted from https://github.com/reach/router/blob/b60e6dd781d5d3a4bdaaf4de665649c0f6a7e78d/src/lib/utils.js
     *
     * https://github.com/reach/router/blob/master/LICENSE
     * */

    const paramRe = /^:(.+)/;

    const SEGMENT_POINTS = 4;
    const STATIC_POINTS = 3;
    const DYNAMIC_POINTS = 2;
    const SPLAT_PENALTY = 1;
    const ROOT_POINTS = 1;

    /**
     * Check if `segment` is a root segment
     * @param {string} segment
     * @return {boolean}
     */
    function isRootSegment(segment) {
      return segment === "";
    }

    /**
     * Check if `segment` is a dynamic segment
     * @param {string} segment
     * @return {boolean}
     */
    function isDynamic(segment) {
      return paramRe.test(segment);
    }

    /**
     * Check if `segment` is a splat
     * @param {string} segment
     * @return {boolean}
     */
    function isSplat(segment) {
      return segment[0] === "*";
    }

    /**
     * Split up the URI into segments delimited by `/`
     * @param {string} uri
     * @return {string[]}
     */
    function segmentize(uri) {
      return (
        uri
          // Strip starting/ending `/`
          .replace(/(^\/+|\/+$)/g, "")
          .split("/")
      );
    }

    /**
     * Strip `str` of potential start and end `/`
     * @param {string} str
     * @return {string}
     */
    function stripSlashes(str) {
      return str.replace(/(^\/+|\/+$)/g, "");
    }

    /**
     * Score a route depending on how its individual segments look
     * @param {object} route
     * @param {number} index
     * @return {object}
     */
    function rankRoute(route, index) {
      const score = route.default
        ? 0
        : segmentize(route.path).reduce((score, segment) => {
            score += SEGMENT_POINTS;

            if (isRootSegment(segment)) {
              score += ROOT_POINTS;
            } else if (isDynamic(segment)) {
              score += DYNAMIC_POINTS;
            } else if (isSplat(segment)) {
              score -= SEGMENT_POINTS + SPLAT_PENALTY;
            } else {
              score += STATIC_POINTS;
            }

            return score;
          }, 0);

      return { route, score, index };
    }

    /**
     * Give a score to all routes and sort them on that
     * @param {object[]} routes
     * @return {object[]}
     */
    function rankRoutes(routes) {
      return (
        routes
          .map(rankRoute)
          // If two routes have the exact same score, we go by index instead
          .sort((a, b) =>
            a.score < b.score ? 1 : a.score > b.score ? -1 : a.index - b.index
          )
      );
    }

    /**
     * Ranks and picks the best route to match. Each segment gets the highest
     * amount of points, then the type of segment gets an additional amount of
     * points where
     *
     *  static > dynamic > splat > root
     *
     * This way we don't have to worry about the order of our routes, let the
     * computers do it.
     *
     * A route looks like this
     *
     *  { path, default, value }
     *
     * And a returned match looks like:
     *
     *  { route, params, uri }
     *
     * @param {object[]} routes
     * @param {string} uri
     * @return {?object}
     */
    function pick(routes, uri) {
      let match;
      let default_;

      const [uriPathname] = uri.split("?");
      const uriSegments = segmentize(uriPathname);
      const isRootUri = uriSegments[0] === "";
      const ranked = rankRoutes(routes);

      for (let i = 0, l = ranked.length; i < l; i++) {
        const route = ranked[i].route;
        let missed = false;

        if (route.default) {
          default_ = {
            route,
            params: {},
            uri
          };
          continue;
        }

        const routeSegments = segmentize(route.path);
        const params = {};
        const max = Math.max(uriSegments.length, routeSegments.length);
        let index = 0;

        for (; index < max; index++) {
          const routeSegment = routeSegments[index];
          const uriSegment = uriSegments[index];

          if (routeSegment !== undefined && isSplat(routeSegment)) {
            // Hit a splat, just grab the rest, and return a match
            // uri:   /files/documents/work
            // route: /files/* or /files/*splatname
            const splatName = routeSegment === "*" ? "*" : routeSegment.slice(1);

            params[splatName] = uriSegments
              .slice(index)
              .map(decodeURIComponent)
              .join("/");
            break;
          }

          if (uriSegment === undefined) {
            // URI is shorter than the route, no match
            // uri:   /users
            // route: /users/:userId
            missed = true;
            break;
          }

          let dynamicMatch = paramRe.exec(routeSegment);

          if (dynamicMatch && !isRootUri) {
            const value = decodeURIComponent(uriSegment);
            params[dynamicMatch[1]] = value;
          } else if (routeSegment !== uriSegment) {
            // Current segments don't match, not dynamic, not splat, so no match
            // uri:   /users/123/settings
            // route: /users/:id/profile
            missed = true;
            break;
          }
        }

        if (!missed) {
          match = {
            route,
            params,
            uri: "/" + uriSegments.slice(0, index).join("/")
          };
          break;
        }
      }

      return match || default_ || null;
    }

    /**
     * Check if the `path` matches the `uri`.
     * @param {string} path
     * @param {string} uri
     * @return {?object}
     */
    function match(route, uri) {
      return pick([route], uri);
    }

    /**
     * Combines the `basepath` and the `path` into one path.
     * @param {string} basepath
     * @param {string} path
     */
    function combinePaths(basepath, path) {
      return `${stripSlashes(
    path === "/" ? basepath : `${stripSlashes(basepath)}/${stripSlashes(path)}`
  )}/`;
    }

    /* node_modules\svelte-routing\src\Router.svelte generated by Svelte v3.12.1 */

    function create_fragment(ctx) {
    	var current;

    	const default_slot_template = ctx.$$slots.default;
    	const default_slot = create_slot(default_slot_template, ctx, null);

    	const block = {
    		c: function create() {
    			if (default_slot) default_slot.c();
    		},

    		l: function claim(nodes) {
    			if (default_slot) default_slot.l(nodes);
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},

    		m: function mount(target, anchor) {
    			if (default_slot) {
    				default_slot.m(target, anchor);
    			}

    			current = true;
    		},

    		p: function update(changed, ctx) {
    			if (default_slot && default_slot.p && changed.$$scope) {
    				default_slot.p(
    					get_slot_changes(default_slot_template, ctx, changed, null),
    					get_slot_context(default_slot_template, ctx, null)
    				);
    			}
    		},

    		i: function intro(local) {
    			if (current) return;
    			transition_in(default_slot, local);
    			current = true;
    		},

    		o: function outro(local) {
    			transition_out(default_slot, local);
    			current = false;
    		},

    		d: function destroy(detaching) {
    			if (default_slot) default_slot.d(detaching);
    		}
    	};
    	dispatch_dev("SvelteRegisterBlock", { block, id: create_fragment.name, type: "component", source: "", ctx });
    	return block;
    }

    function instance($$self, $$props, $$invalidate) {
    	let $base, $location, $routes;

    	

      let { basepath = "/", url = null } = $$props;

      const locationContext = getContext(LOCATION);
      const routerContext = getContext(ROUTER);

      const routes = writable([]); validate_store(routes, 'routes'); component_subscribe($$self, routes, $$value => { $routes = $$value; $$invalidate('$routes', $routes); });
      const activeRoute = writable(null);
      let hasActiveRoute = false; // Used in SSR to synchronously set that a Route is active.

      // If locationContext is not set, this is the topmost Router in the tree.
      // If the `url` prop is given we force the location to it.
      const location =
        locationContext ||
        writable(url ? { pathname: url } : globalHistory.location); validate_store(location, 'location'); component_subscribe($$self, location, $$value => { $location = $$value; $$invalidate('$location', $location); });

      // If routerContext is set, the routerBase of the parent Router
      // will be the base for this Router's descendants.
      // If routerContext is not set, the path and resolved uri will both
      // have the value of the basepath prop.
      const base = routerContext
        ? routerContext.routerBase
        : writable({
            path: basepath,
            uri: basepath
          }); validate_store(base, 'base'); component_subscribe($$self, base, $$value => { $base = $$value; $$invalidate('$base', $base); });

      const routerBase = derived([base, activeRoute], ([base, activeRoute]) => {
        // If there is no activeRoute, the routerBase will be identical to the base.
        if (activeRoute === null) {
          return base;
        }

        const { path: basepath } = base;
        const { route, uri } = activeRoute;
        // Remove the potential /* or /*splatname from
        // the end of the child Routes relative paths.
        const path = route.default ? basepath : route.path.replace(/\*.*$/, "");

        return { path, uri };
      });

      function registerRoute(route) {
        const { path: basepath } = $base;
        let { path } = route;

        // We store the original path in the _path property so we can reuse
        // it when the basepath changes. The only thing that matters is that
        // the route reference is intact, so mutation is fine.
        route._path = path;
        route.path = combinePaths(basepath, path);

        if (typeof window === "undefined") {
          // In SSR we should set the activeRoute immediately if it is a match.
          // If there are more Routes being registered after a match is found,
          // we just skip them.
          if (hasActiveRoute) {
            return;
          }

          const matchingRoute = match(route, $location.pathname);
          if (matchingRoute) {
            activeRoute.set(matchingRoute);
            hasActiveRoute = true;
          }
        } else {
          routes.update(rs => {
            rs.push(route);
            return rs;
          });
        }
      }

      function unregisterRoute(route) {
        routes.update(rs => {
          const index = rs.indexOf(route);
          rs.splice(index, 1);
          return rs;
        });
      }

      if (!locationContext) {
        // The topmost Router in the tree is responsible for updating
        // the location store and supplying it through context.
        onMount(() => {
          const unlisten = globalHistory.listen(history => {
            location.set(history.location);
          });

          return unlisten;
        });

        setContext(LOCATION, location);
      }

      setContext(ROUTER, {
        activeRoute,
        base,
        routerBase,
        registerRoute,
        unregisterRoute
      });

    	const writable_props = ['basepath', 'url'];
    	Object.keys($$props).forEach(key => {
    		if (!writable_props.includes(key) && !key.startsWith('$$')) console.warn(`<Router> was created with unknown prop '${key}'`);
    	});

    	let { $$slots = {}, $$scope } = $$props;

    	$$self.$set = $$props => {
    		if ('basepath' in $$props) $$invalidate('basepath', basepath = $$props.basepath);
    		if ('url' in $$props) $$invalidate('url', url = $$props.url);
    		if ('$$scope' in $$props) $$invalidate('$$scope', $$scope = $$props.$$scope);
    	};

    	$$self.$capture_state = () => {
    		return { basepath, url, hasActiveRoute, $base, $location, $routes };
    	};

    	$$self.$inject_state = $$props => {
    		if ('basepath' in $$props) $$invalidate('basepath', basepath = $$props.basepath);
    		if ('url' in $$props) $$invalidate('url', url = $$props.url);
    		if ('hasActiveRoute' in $$props) hasActiveRoute = $$props.hasActiveRoute;
    		if ('$base' in $$props) base.set($base);
    		if ('$location' in $$props) location.set($location);
    		if ('$routes' in $$props) routes.set($routes);
    	};

    	$$self.$$.update = ($$dirty = { $base: 1, $routes: 1, $location: 1 }) => {
    		if ($$dirty.$base) { {
            const { path: basepath } = $base;
            routes.update(rs => {
              rs.forEach(r => (r.path = combinePaths(basepath, r._path)));
              return rs;
            });
          } }
    		if ($$dirty.$routes || $$dirty.$location) { {
            const bestMatch = pick($routes, $location.pathname);
            activeRoute.set(bestMatch);
          } }
    	};

    	return {
    		basepath,
    		url,
    		routes,
    		location,
    		base,
    		$$slots,
    		$$scope
    	};
    }

    class Router extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance, create_fragment, safe_not_equal, ["basepath", "url"]);
    		dispatch_dev("SvelteRegisterComponent", { component: this, tagName: "Router", options, id: create_fragment.name });
    	}

    	get basepath() {
    		throw new Error("<Router>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set basepath(value) {
    		throw new Error("<Router>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get url() {
    		throw new Error("<Router>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set url(value) {
    		throw new Error("<Router>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* node_modules\svelte-routing\src\Route.svelte generated by Svelte v3.12.1 */

    const get_default_slot_changes = ({ routeParams, $location }) => ({ params: routeParams, location: $location });
    const get_default_slot_context = ({ routeParams, $location }) => ({
    	params: routeParams,
    	location: $location
    });

    // (40:0) {#if $activeRoute !== null && $activeRoute.route === route}
    function create_if_block(ctx) {
    	var current_block_type_index, if_block, if_block_anchor, current;

    	var if_block_creators = [
    		create_if_block_1,
    		create_else_block
    	];

    	var if_blocks = [];

    	function select_block_type(changed, ctx) {
    		if (ctx.component !== null) return 0;
    		return 1;
    	}

    	current_block_type_index = select_block_type(null, ctx);
    	if_block = if_blocks[current_block_type_index] = if_block_creators[current_block_type_index](ctx);

    	const block = {
    		c: function create() {
    			if_block.c();
    			if_block_anchor = empty();
    		},

    		m: function mount(target, anchor) {
    			if_blocks[current_block_type_index].m(target, anchor);
    			insert_dev(target, if_block_anchor, anchor);
    			current = true;
    		},

    		p: function update(changed, ctx) {
    			var previous_block_index = current_block_type_index;
    			current_block_type_index = select_block_type(changed, ctx);
    			if (current_block_type_index === previous_block_index) {
    				if_blocks[current_block_type_index].p(changed, ctx);
    			} else {
    				group_outros();
    				transition_out(if_blocks[previous_block_index], 1, 1, () => {
    					if_blocks[previous_block_index] = null;
    				});
    				check_outros();

    				if_block = if_blocks[current_block_type_index];
    				if (!if_block) {
    					if_block = if_blocks[current_block_type_index] = if_block_creators[current_block_type_index](ctx);
    					if_block.c();
    				}
    				transition_in(if_block, 1);
    				if_block.m(if_block_anchor.parentNode, if_block_anchor);
    			}
    		},

    		i: function intro(local) {
    			if (current) return;
    			transition_in(if_block);
    			current = true;
    		},

    		o: function outro(local) {
    			transition_out(if_block);
    			current = false;
    		},

    		d: function destroy(detaching) {
    			if_blocks[current_block_type_index].d(detaching);

    			if (detaching) {
    				detach_dev(if_block_anchor);
    			}
    		}
    	};
    	dispatch_dev("SvelteRegisterBlock", { block, id: create_if_block.name, type: "if", source: "(40:0) {#if $activeRoute !== null && $activeRoute.route === route}", ctx });
    	return block;
    }

    // (43:2) {:else}
    function create_else_block(ctx) {
    	var current;

    	const default_slot_template = ctx.$$slots.default;
    	const default_slot = create_slot(default_slot_template, ctx, get_default_slot_context);

    	const block = {
    		c: function create() {
    			if (default_slot) default_slot.c();
    		},

    		l: function claim(nodes) {
    			if (default_slot) default_slot.l(nodes);
    		},

    		m: function mount(target, anchor) {
    			if (default_slot) {
    				default_slot.m(target, anchor);
    			}

    			current = true;
    		},

    		p: function update(changed, ctx) {
    			if (default_slot && default_slot.p && (changed.$$scope || changed.routeParams || changed.$location)) {
    				default_slot.p(
    					get_slot_changes(default_slot_template, ctx, changed, get_default_slot_changes),
    					get_slot_context(default_slot_template, ctx, get_default_slot_context)
    				);
    			}
    		},

    		i: function intro(local) {
    			if (current) return;
    			transition_in(default_slot, local);
    			current = true;
    		},

    		o: function outro(local) {
    			transition_out(default_slot, local);
    			current = false;
    		},

    		d: function destroy(detaching) {
    			if (default_slot) default_slot.d(detaching);
    		}
    	};
    	dispatch_dev("SvelteRegisterBlock", { block, id: create_else_block.name, type: "else", source: "(43:2) {:else}", ctx });
    	return block;
    }

    // (41:2) {#if component !== null}
    function create_if_block_1(ctx) {
    	var switch_instance_anchor, current;

    	var switch_instance_spread_levels = [
    		{ location: ctx.$location },
    		ctx.routeParams,
    		ctx.routeProps
    	];

    	var switch_value = ctx.component;

    	function switch_props(ctx) {
    		let switch_instance_props = {};
    		for (var i = 0; i < switch_instance_spread_levels.length; i += 1) {
    			switch_instance_props = assign(switch_instance_props, switch_instance_spread_levels[i]);
    		}
    		return {
    			props: switch_instance_props,
    			$$inline: true
    		};
    	}

    	if (switch_value) {
    		var switch_instance = new switch_value(switch_props());
    	}

    	const block = {
    		c: function create() {
    			if (switch_instance) switch_instance.$$.fragment.c();
    			switch_instance_anchor = empty();
    		},

    		m: function mount(target, anchor) {
    			if (switch_instance) {
    				mount_component(switch_instance, target, anchor);
    			}

    			insert_dev(target, switch_instance_anchor, anchor);
    			current = true;
    		},

    		p: function update(changed, ctx) {
    			var switch_instance_changes = (changed.$location || changed.routeParams || changed.routeProps) ? get_spread_update(switch_instance_spread_levels, [
    									(changed.$location) && { location: ctx.$location },
    			(changed.routeParams) && get_spread_object(ctx.routeParams),
    			(changed.routeProps) && get_spread_object(ctx.routeProps)
    								]) : {};

    			if (switch_value !== (switch_value = ctx.component)) {
    				if (switch_instance) {
    					group_outros();
    					const old_component = switch_instance;
    					transition_out(old_component.$$.fragment, 1, 0, () => {
    						destroy_component(old_component, 1);
    					});
    					check_outros();
    				}

    				if (switch_value) {
    					switch_instance = new switch_value(switch_props());

    					switch_instance.$$.fragment.c();
    					transition_in(switch_instance.$$.fragment, 1);
    					mount_component(switch_instance, switch_instance_anchor.parentNode, switch_instance_anchor);
    				} else {
    					switch_instance = null;
    				}
    			}

    			else if (switch_value) {
    				switch_instance.$set(switch_instance_changes);
    			}
    		},

    		i: function intro(local) {
    			if (current) return;
    			if (switch_instance) transition_in(switch_instance.$$.fragment, local);

    			current = true;
    		},

    		o: function outro(local) {
    			if (switch_instance) transition_out(switch_instance.$$.fragment, local);
    			current = false;
    		},

    		d: function destroy(detaching) {
    			if (detaching) {
    				detach_dev(switch_instance_anchor);
    			}

    			if (switch_instance) destroy_component(switch_instance, detaching);
    		}
    	};
    	dispatch_dev("SvelteRegisterBlock", { block, id: create_if_block_1.name, type: "if", source: "(41:2) {#if component !== null}", ctx });
    	return block;
    }

    function create_fragment$1(ctx) {
    	var if_block_anchor, current;

    	var if_block = (ctx.$activeRoute !== null && ctx.$activeRoute.route === ctx.route) && create_if_block(ctx);

    	const block = {
    		c: function create() {
    			if (if_block) if_block.c();
    			if_block_anchor = empty();
    		},

    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},

    		m: function mount(target, anchor) {
    			if (if_block) if_block.m(target, anchor);
    			insert_dev(target, if_block_anchor, anchor);
    			current = true;
    		},

    		p: function update(changed, ctx) {
    			if (ctx.$activeRoute !== null && ctx.$activeRoute.route === ctx.route) {
    				if (if_block) {
    					if_block.p(changed, ctx);
    					transition_in(if_block, 1);
    				} else {
    					if_block = create_if_block(ctx);
    					if_block.c();
    					transition_in(if_block, 1);
    					if_block.m(if_block_anchor.parentNode, if_block_anchor);
    				}
    			} else if (if_block) {
    				group_outros();
    				transition_out(if_block, 1, 1, () => {
    					if_block = null;
    				});
    				check_outros();
    			}
    		},

    		i: function intro(local) {
    			if (current) return;
    			transition_in(if_block);
    			current = true;
    		},

    		o: function outro(local) {
    			transition_out(if_block);
    			current = false;
    		},

    		d: function destroy(detaching) {
    			if (if_block) if_block.d(detaching);

    			if (detaching) {
    				detach_dev(if_block_anchor);
    			}
    		}
    	};
    	dispatch_dev("SvelteRegisterBlock", { block, id: create_fragment$1.name, type: "component", source: "", ctx });
    	return block;
    }

    function instance$1($$self, $$props, $$invalidate) {
    	let $activeRoute, $location;

    	

      let { path = "", component = null } = $$props;

      const { registerRoute, unregisterRoute, activeRoute } = getContext(ROUTER); validate_store(activeRoute, 'activeRoute'); component_subscribe($$self, activeRoute, $$value => { $activeRoute = $$value; $$invalidate('$activeRoute', $activeRoute); });
      const location = getContext(LOCATION); validate_store(location, 'location'); component_subscribe($$self, location, $$value => { $location = $$value; $$invalidate('$location', $location); });

      const route = {
        path,
        // If no path prop is given, this Route will act as the default Route
        // that is rendered if no other Route in the Router is a match.
        default: path === ""
      };
      let routeParams = {};
      let routeProps = {};

      registerRoute(route);

      // There is no need to unregister Routes in SSR since it will all be
      // thrown away anyway.
      if (typeof window !== "undefined") {
        onDestroy(() => {
          unregisterRoute(route);
        });
      }

    	let { $$slots = {}, $$scope } = $$props;

    	$$self.$set = $$new_props => {
    		$$invalidate('$$props', $$props = assign(assign({}, $$props), $$new_props));
    		if ('path' in $$new_props) $$invalidate('path', path = $$new_props.path);
    		if ('component' in $$new_props) $$invalidate('component', component = $$new_props.component);
    		if ('$$scope' in $$new_props) $$invalidate('$$scope', $$scope = $$new_props.$$scope);
    	};

    	$$self.$capture_state = () => {
    		return { path, component, routeParams, routeProps, $activeRoute, $location };
    	};

    	$$self.$inject_state = $$new_props => {
    		$$invalidate('$$props', $$props = assign(assign({}, $$props), $$new_props));
    		if ('path' in $$props) $$invalidate('path', path = $$new_props.path);
    		if ('component' in $$props) $$invalidate('component', component = $$new_props.component);
    		if ('routeParams' in $$props) $$invalidate('routeParams', routeParams = $$new_props.routeParams);
    		if ('routeProps' in $$props) $$invalidate('routeProps', routeProps = $$new_props.routeProps);
    		if ('$activeRoute' in $$props) activeRoute.set($activeRoute);
    		if ('$location' in $$props) location.set($location);
    	};

    	$$self.$$.update = ($$dirty = { $activeRoute: 1, $$props: 1 }) => {
    		if ($$dirty.$activeRoute) { if ($activeRoute && $activeRoute.route === route) {
            $$invalidate('routeParams', routeParams = $activeRoute.params);
          } }
    		{
            const { path, component, ...rest } = $$props;
            $$invalidate('routeProps', routeProps = rest);
          }
    	};

    	return {
    		path,
    		component,
    		activeRoute,
    		location,
    		route,
    		routeParams,
    		routeProps,
    		$activeRoute,
    		$location,
    		$$props: $$props = exclude_internal_props($$props),
    		$$slots,
    		$$scope
    	};
    }

    class Route extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$1, create_fragment$1, safe_not_equal, ["path", "component"]);
    		dispatch_dev("SvelteRegisterComponent", { component: this, tagName: "Route", options, id: create_fragment$1.name });
    	}

    	get path() {
    		throw new Error("<Route>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set path(value) {
    		throw new Error("<Route>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get component() {
    		throw new Error("<Route>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set component(value) {
    		throw new Error("<Route>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    var commonjsGlobal = typeof globalThis !== 'undefined' ? globalThis : typeof window !== 'undefined' ? window : typeof global !== 'undefined' ? global : typeof self !== 'undefined' ? self : {};

    function createCommonjsModule(fn, module) {
    	return module = { exports: {} }, fn(module, module.exports), module.exports;
    }

    var src = createCommonjsModule(function (module, exports) {
    /*
    * Rexine 2.0.0 read csv files easily
    * created by shawroger 2019
    */

    !(function(global, factory) {   
        {
            module.exports = factory();
        }
    }(commonjsGlobal, function() {
        
        var o = {};


        //version of Rexine

        o.name = 'rexine';

        o.VERSION = '2.0.0';
        
        // if true report warnings and advice 

        o.IF_REPORT = true;

        // cut down more space and enter 

        o.TRIM = true;
        
        // random config
        
        o.random = { name: 'rexine', digit: 3 };

        
        //json index names

        o.JSON_INDEX = 'DATA';

        //DIY json index names

        o.JSON_INDEX_ARRAY = [];

        //init plugin stores and its identifier 

        o.plugin = [];

        o.pluginIdentifier = '$';

        //log if reported

        var o_log = function (text) {

            if(o.IF_REPORT) {
                console.log(text);
            }
        };
        
        
        //install plugin such as Crearia
        
        o.use = function(plugin,name='plugin') {

            var ADD_PLUGIN = {};
            var PLUGIN_NAME = 'plugin' + this.plugin.length;

            if(plugin.name) {

                PLUGIN_NAME = plugin.name;

                if(name !== 'plugin') {
                    PLUGIN_NAME = name;
                }
            }
            
            
            PLUGIN_NAME = this.pluginIdentifier + PLUGIN_NAME;

            ADD_PLUGIN[PLUGIN_NAME] = plugin;
            Object.assign(this,ADD_PLUGIN);

            this.plugin.push(plugin);
            
        };

        //install for vue

        o.install = function(Vue, options) {
            Vue.prototype.$rexine = this;
        };

        //mixin for other object

        o.mixin = function(Obj,name=it.name) {

            var ADD_OBJ = {};
            var OBJ_NAME = this.pluginIdentifier + name;

            ADD_OBJ[OBJ_NAME] = this;

            Object.assign(Obj,ADD_OBJ);

        };


        //csv to array function
        
        o.csv = function(data) {

            var array = [];

            var body = data.split(/[\n]/);
            var head = body[0].split(",");

            var width = head.length;
            var height = body.length;
            
            for(var i=0; i < height; i++) {
                array[i] = [];
            }
            
            for(var i=0; i < height; i++) {

                var row = body[i].split(","); 

                for(var j=0; j<width; j++) {

                    array[i][j] = row[j];
                }
            }
            
            return array;
        };
        
        //array to json function

        o.arrayToJson = function(data) {

            var json = '[';
            
            for (let i=0; i<data.length; i++){
                
                json = json + "{\n";
                
                for (let j=0; j<data[0].length; j++) {
                    
                    json = json + '"';
                    
                    if (this.JSON_INDEX_ARRAY.length >= data[0].length) {
                        
                        json = json + this.JSON_INDEX_ARRAY[j];    
                        
                    } else {
                        
                        json = json + this.JSON_INDEX + j;
                    }
                    
                    if (this.TRIM && j>=data[0].length-1 && i < data.length-1) {
                        
                        json = json + '":"'+ data[i][j].substr(0,data[i][j].length-1) + '"';
                        
                    } else {
                        
                        json = json + '":"'+ data[i][j] + '"';
                    }
                    
                    if (j < data[0].length-1) {
                        
                        json = json + ',';
                    }
                    
                    json = json + "\n";
                }
                
                json = json + '}';
                
                if (i < data.length-1) {
                    json = json + ','+ "\n";
                }
            }
            
            json = json + ']';
            json = JSON.parse(json);
            
            return json;
        };


        o.jsonToArray = function(json) {
            var json = JSON.parse(json);
            var cross = [];
            for(var i=0; i < json.length; i++) {
                cross[i] = [];
            }
            for (var i=0; i < json.length; i++) {
                for (var j=0; j < Object.keys(json[0]).length;j++) {
                    cross[i][j] = Object.values(json[i])[j];
                }
            }    
            return cross;
        };

        //get csv files
        
        o.read = function(data) {
            
            o_log("Rexine is running successfully");

            this.data = data;
            this.array = this.csv(data);
            this.init(this.array);
            
        };

        //initize all data in Rexine
        
        o.init = function(array) {

            this.json = this.arrayToJson(array);
            this.arrange = [];
            this.transArray = [];
            this.height = array.length;
            this.width = (array[0]).length;

            if(this.JSON_INDEX_ARRAY.length < this.width) {
                var _JSON_INDEX_ARRAY = [];
                for (var i=0; i < this.width; i++) {
                    var JSON_INDEX_FILL = this.JSON_INDEX + i;
                    _JSON_INDEX_ARRAY.push(JSON_INDEX_FILL);
                }
                this.JSON_INDEX_ARRAY = _JSON_INDEX_ARRAY;
            }
            
            for (var i=0; i < this.height; i++) {
                this.arrange[i] = i;
            }
            for (var i=0; i < this.width; i++) {
                this.transArray[i] = [];
            }
            for (var i=0; i < this.height; i++) {
                for (var j=0; j < this.width; j++) {
                    this.transArray[j][i] = array[i][j];
                }
            } 
            
        };

        /*
        * copy a new object as Rexine
        * should be done at the first time
        */
        o.new = function() {
            var NEW_COPY = Object.assign({}, this);
            NEW_COPY.new = false;
            return NEW_COPY;
        };


        /*
        * import method 
        * new features 
        * ajax get files
        * in Rexine 2.0.0 removed the json options
        * only focus on csv files
        * use Crearia to send ajax request
        * remove 'then' function 
        * use callback instead
        */
        
        o.import = function(URL,callback) { 

            if(URL == undefined) {
                o_log("You need to get an availble address first.");
                return false;
            }
            /*
            * Crearia data object
            */
            var data = {
                url: URL,
                get:true,
                post: false,
                random: {
                    name: this.random.name,
                    digit: this.random.digit,
                },
            };

            /*
            * must use Crearia 
            * Rexine must work with Crearia since V-2.0.0
            */
            this.$crearia.ajax(data,(e) => {
                this.read(e.data);
                callback.call(this,this);
            });

        };
        /*
        * search in json 
        * return an array
        */
        o.seek = function(array) {

            var SEEK = {};
            var RESULT = [];

            for(var i in array) {
                if(array[i]) {
                    SEEK[this.JSON_INDEX_ARRAY[i]] = array[i];
                }
            }
            for(var i in this.json) {
                var GET_JSON_ITEM = this.json[i];
                for(var j in SEEK){
                    if(GET_JSON_ITEM[j] !== SEEK[j]){
                        continue;
                    }
                    Object.assign(GET_JSON_ITEM,{row: i});
                    RESULT.push(GET_JSON_ITEM);
                }
            }

            return RESULT;
        };


        o.sort = function(method) {

            var SORT = [];
            var SORTED_ARR = [];
            var UNSORTED_ARR = [];


            /*
            * once sort the array will copy an origin array
            * active the reset method
            * then can use it after using sort()
            */

            this.initArray = this.array;

            this.reset = () => {
                this.array = this.initArray;
                this.init(this.array);
            };


            for(var i in this.array) {
                SORTED_ARR[i] = method.call(this,this.array[i]);
            }
            
            for(var i in SORTED_ARR) {
                UNSORTED_ARR[i] = SORTED_ARR[i];
            }

            SORTED_ARR.sort();

            for (var i in SORTED_ARR) {
                for (var j in UNSORTED_ARR) {
                    if(UNSORTED_ARR[j] === SORTED_ARR[i]) {
                        SORT.push(this.array[j]);
                        UNSORTED_ARR[j] = '%_@_$_undefined_$_@_%';
                    }
                }
            }

            this.array = SORT;
            this.init(SORT);
        };

        /*
        * file read method 
        * no-ajax ways
        * Rexine 2.0.0 new feature
        * only focus on csv files
        * no need Crearia to send ajax request
        * able to use callback instead
        */

        o.file = function(selector, callback ,READ = true) {

            var fileSelector = document.querySelector(selector);

            fileSelector.onchange = () => {

                if(fileSelector.files[0]) {
                    this.rawFile(fileSelector.files[0]);
                } else {
                    console.warn('missing file content');
                }
            };
        };


        o.rawFile = function(files ,callback ,READ = true) {
            var fileReader = new FileReader();
            fileReader.readAsText(files, "UTF-8");
            fileReader.onload = (e) => {
                if(READ) {
                    this.read(e.target.result);
                }
                if(callback) {
                    callback.call(this,this,e,e.target.result);
                }

            };
        };

        /*
        * old method 
        * ajax get files
        * Rexine 2.0.0 keep it to make compatible
        * only focus on csv files
        * no need Crearia to send ajax request
        * still use 'then' function 
        * no use callback instead
        */

        o.get = function(Url,callback) { 

            if(Url === undefined) { 
                o_log("You need to get an availble address first.");
                return false;
            }

            /*
            * use new feature but no worry about compatiblity
            * it does not make any bad result
            * just make any request with forcing-fresh params
            */

            if(this.random) {

                var rand_name = this.random.name;

                var rand_value = Math.floor(Math.pow(10,(parseInt(this.random.digit)+1))*Math.random());

                Url = Url + '?' + rand_name + '=' + rand_value;
            }

            /*
            * init then function as a callback
            * and it should be reset after using
            */

            this.then = function(){};

            var xmlhttp = new XMLHttpRequest();

            xmlhttp.onreadystatechange = () => {

                if(xmlhttp.readyState == 4 && xmlhttp.status == 200) {               

                    this.read(xmlhttp.responseText);
                    /*
                    * if use callback
                    * do it first
                    * then do then()
                    */
                    if(callback) {
                        callback.call(this,this);
                    }          

                    this.then();
                }
            };

            xmlhttp.open("GET", Url, true);
            xmlhttp.send();

        };

        return o;

    }));
    });

    function getSource(callback) {
    	src.get('./source/source.txt',(e)=>{
    		callback.call(this,e);
    	});
    }

    const changePage = writable(true);

    const app = {
    	title: '档案馆',
    };

    function cubicOut(t) {
        const f = t - 1.0;
        return f * f * f + 1.0;
    }

    function slide(node, { delay = 0, duration = 400, easing = cubicOut }) {
        const style = getComputedStyle(node);
        const opacity = +style.opacity;
        const height = parseFloat(style.height);
        const padding_top = parseFloat(style.paddingTop);
        const padding_bottom = parseFloat(style.paddingBottom);
        const margin_top = parseFloat(style.marginTop);
        const margin_bottom = parseFloat(style.marginBottom);
        const border_top_width = parseFloat(style.borderTopWidth);
        const border_bottom_width = parseFloat(style.borderBottomWidth);
        return {
            delay,
            duration,
            easing,
            css: t => `overflow: hidden;` +
                `opacity: ${Math.min(t * 20, 1) * opacity};` +
                `height: ${t * height}px;` +
                `padding-top: ${t * padding_top}px;` +
                `padding-bottom: ${t * padding_bottom}px;` +
                `margin-top: ${t * margin_top}px;` +
                `margin-bottom: ${t * margin_bottom}px;` +
                `border-top-width: ${t * border_top_width}px;` +
                `border-bottom-width: ${t * border_bottom_width}px;`
        };
    }

    function toVal(mix) {
    	var k, y, str='';
    	if (mix) {
    		if (typeof mix === 'object') {
    			if (!!mix.push) {
    				for (k=0; k < mix.length; k++) {
    					if (mix[k] && (y = toVal(mix[k]))) {
    						str && (str += ' ');
    						str += y;
    					}
    				}
    			} else {
    				for (k in mix) {
    					if (mix[k] && (y = toVal(k))) {
    						str && (str += ' ');
    						str += y;
    					}
    				}
    			}
    		} else if (typeof mix !== 'boolean' && !mix.call) {
    			str && (str += ' ');
    			str += mix;
    		}
    	}
    	return str;
    }

    function clsx () {
    	var i=0, x, str='';
    	while (i < arguments.length) {
    		if (x = toVal(arguments[i++])) {
    			str && (str += ' ');
    			str += x;
    		}
    	}
    	return str;
    }

    function clean($$props) {
      const rest = {};
      for (const key of Object.keys($$props)) {
        if (key !== "children" && key !== "$$scope" && key !== "$$slots") {
          rest[key] = $$props[key];
        }
      }
      return rest;
    }

    /* node_modules\sveltestrap\src\Button.svelte generated by Svelte v3.12.1 */

    const file = "node_modules\\sveltestrap\\src\\Button.svelte";

    // (54:0) {:else}
    function create_else_block_1(ctx) {
    	var button, current_block_type_index, if_block, current, dispose;

    	const default_slot_template = ctx.$$slots.default;
    	const default_slot = create_slot(default_slot_template, ctx, null);

    	var if_block_creators = [
    		create_if_block_2,
    		create_if_block_3,
    		create_else_block_2
    	];

    	var if_blocks = [];

    	function select_block_type_2(changed, ctx) {
    		if (ctx.close) return 0;
    		if (ctx.children) return 1;
    		return 2;
    	}

    	current_block_type_index = select_block_type_2(null, ctx);
    	if_block = if_blocks[current_block_type_index] = if_block_creators[current_block_type_index](ctx);

    	var button_levels = [
    		ctx.props,
    		{ id: ctx.id },
    		{ class: ctx.classes },
    		{ disabled: ctx.disabled },
    		{ value: ctx.value },
    		{ "aria-label": ctx.ariaLabel || ctx.defaultAriaLabel },
    		{ style: ctx.style }
    	];

    	var button_data = {};
    	for (var i = 0; i < button_levels.length; i += 1) {
    		button_data = assign(button_data, button_levels[i]);
    	}

    	const block = {
    		c: function create() {
    			button = element("button");

    			if (!default_slot) {
    				if_block.c();
    			}

    			if (default_slot) default_slot.c();

    			set_attributes(button, button_data);
    			add_location(button, file, 54, 2, 1068);
    			dispose = listen_dev(button, "click", ctx.click_handler_1);
    		},

    		l: function claim(nodes) {
    			if (default_slot) default_slot.l(button_nodes);
    		},

    		m: function mount(target, anchor) {
    			insert_dev(target, button, anchor);

    			if (!default_slot) {
    				if_blocks[current_block_type_index].m(button, null);
    			}

    			else {
    				default_slot.m(button, null);
    			}

    			current = true;
    		},

    		p: function update(changed, ctx) {
    			if (!default_slot) {
    				var previous_block_index = current_block_type_index;
    				current_block_type_index = select_block_type_2(changed, ctx);
    				if (current_block_type_index === previous_block_index) {
    					if_blocks[current_block_type_index].p(changed, ctx);
    				} else {
    					group_outros();
    					transition_out(if_blocks[previous_block_index], 1, 1, () => {
    						if_blocks[previous_block_index] = null;
    					});
    					check_outros();

    					if_block = if_blocks[current_block_type_index];
    					if (!if_block) {
    						if_block = if_blocks[current_block_type_index] = if_block_creators[current_block_type_index](ctx);
    						if_block.c();
    					}
    					transition_in(if_block, 1);
    					if_block.m(button, null);
    				}
    			}

    			if (default_slot && default_slot.p && changed.$$scope) {
    				default_slot.p(
    					get_slot_changes(default_slot_template, ctx, changed, null),
    					get_slot_context(default_slot_template, ctx, null)
    				);
    			}

    			set_attributes(button, get_spread_update(button_levels, [
    				(changed.props) && ctx.props,
    				(changed.id) && { id: ctx.id },
    				(changed.classes) && { class: ctx.classes },
    				(changed.disabled) && { disabled: ctx.disabled },
    				(changed.value) && { value: ctx.value },
    				(changed.ariaLabel || changed.defaultAriaLabel) && { "aria-label": ctx.ariaLabel || ctx.defaultAriaLabel },
    				(changed.style) && { style: ctx.style }
    			]));
    		},

    		i: function intro(local) {
    			if (current) return;
    			transition_in(if_block);
    			transition_in(default_slot, local);
    			current = true;
    		},

    		o: function outro(local) {
    			transition_out(if_block);
    			transition_out(default_slot, local);
    			current = false;
    		},

    		d: function destroy(detaching) {
    			if (detaching) {
    				detach_dev(button);
    			}

    			if (!default_slot) {
    				if_blocks[current_block_type_index].d();
    			}

    			if (default_slot) default_slot.d(detaching);
    			dispose();
    		}
    	};
    	dispatch_dev("SvelteRegisterBlock", { block, id: create_else_block_1.name, type: "else", source: "(54:0) {:else}", ctx });
    	return block;
    }

    // (37:0) {#if href}
    function create_if_block$1(ctx) {
    	var a, current_block_type_index, if_block, current, dispose;

    	var if_block_creators = [
    		create_if_block_1$1,
    		create_else_block$1
    	];

    	var if_blocks = [];

    	function select_block_type_1(changed, ctx) {
    		if (ctx.children) return 0;
    		return 1;
    	}

    	current_block_type_index = select_block_type_1(null, ctx);
    	if_block = if_blocks[current_block_type_index] = if_block_creators[current_block_type_index](ctx);

    	var a_levels = [
    		ctx.props,
    		{ id: ctx.id },
    		{ class: ctx.classes },
    		{ disabled: ctx.disabled },
    		{ href: ctx.href },
    		{ "aria-label": ctx.ariaLabel || ctx.defaultAriaLabel },
    		{ style: ctx.style }
    	];

    	var a_data = {};
    	for (var i = 0; i < a_levels.length; i += 1) {
    		a_data = assign(a_data, a_levels[i]);
    	}

    	const block = {
    		c: function create() {
    			a = element("a");
    			if_block.c();
    			set_attributes(a, a_data);
    			add_location(a, file, 37, 2, 825);
    			dispose = listen_dev(a, "click", ctx.click_handler);
    		},

    		m: function mount(target, anchor) {
    			insert_dev(target, a, anchor);
    			if_blocks[current_block_type_index].m(a, null);
    			current = true;
    		},

    		p: function update(changed, ctx) {
    			var previous_block_index = current_block_type_index;
    			current_block_type_index = select_block_type_1(changed, ctx);
    			if (current_block_type_index === previous_block_index) {
    				if_blocks[current_block_type_index].p(changed, ctx);
    			} else {
    				group_outros();
    				transition_out(if_blocks[previous_block_index], 1, 1, () => {
    					if_blocks[previous_block_index] = null;
    				});
    				check_outros();

    				if_block = if_blocks[current_block_type_index];
    				if (!if_block) {
    					if_block = if_blocks[current_block_type_index] = if_block_creators[current_block_type_index](ctx);
    					if_block.c();
    				}
    				transition_in(if_block, 1);
    				if_block.m(a, null);
    			}

    			set_attributes(a, get_spread_update(a_levels, [
    				(changed.props) && ctx.props,
    				(changed.id) && { id: ctx.id },
    				(changed.classes) && { class: ctx.classes },
    				(changed.disabled) && { disabled: ctx.disabled },
    				(changed.href) && { href: ctx.href },
    				(changed.ariaLabel || changed.defaultAriaLabel) && { "aria-label": ctx.ariaLabel || ctx.defaultAriaLabel },
    				(changed.style) && { style: ctx.style }
    			]));
    		},

    		i: function intro(local) {
    			if (current) return;
    			transition_in(if_block);
    			current = true;
    		},

    		o: function outro(local) {
    			transition_out(if_block);
    			current = false;
    		},

    		d: function destroy(detaching) {
    			if (detaching) {
    				detach_dev(a);
    			}

    			if_blocks[current_block_type_index].d();
    			dispose();
    		}
    	};
    	dispatch_dev("SvelteRegisterBlock", { block, id: create_if_block$1.name, type: "if", source: "(37:0) {#if href}", ctx });
    	return block;
    }

    // (70:6) {:else}
    function create_else_block_2(ctx) {
    	var current;

    	const default_slot_template = ctx.$$slots.default;
    	const default_slot = create_slot(default_slot_template, ctx, null);

    	const block = {
    		c: function create() {
    			if (default_slot) default_slot.c();
    		},

    		l: function claim(nodes) {
    			if (default_slot) default_slot.l(nodes);
    		},

    		m: function mount(target, anchor) {
    			if (default_slot) {
    				default_slot.m(target, anchor);
    			}

    			current = true;
    		},

    		p: function update(changed, ctx) {
    			if (default_slot && default_slot.p && changed.$$scope) {
    				default_slot.p(
    					get_slot_changes(default_slot_template, ctx, changed, null),
    					get_slot_context(default_slot_template, ctx, null)
    				);
    			}
    		},

    		i: function intro(local) {
    			if (current) return;
    			transition_in(default_slot, local);
    			current = true;
    		},

    		o: function outro(local) {
    			transition_out(default_slot, local);
    			current = false;
    		},

    		d: function destroy(detaching) {
    			if (default_slot) default_slot.d(detaching);
    		}
    	};
    	dispatch_dev("SvelteRegisterBlock", { block, id: create_else_block_2.name, type: "else", source: "(70:6) {:else}", ctx });
    	return block;
    }

    // (68:25) 
    function create_if_block_3(ctx) {
    	var t;

    	const block = {
    		c: function create() {
    			t = text(ctx.children);
    		},

    		m: function mount(target, anchor) {
    			insert_dev(target, t, anchor);
    		},

    		p: function update(changed, ctx) {
    			if (changed.children) {
    				set_data_dev(t, ctx.children);
    			}
    		},

    		i: noop,
    		o: noop,

    		d: function destroy(detaching) {
    			if (detaching) {
    				detach_dev(t);
    			}
    		}
    	};
    	dispatch_dev("SvelteRegisterBlock", { block, id: create_if_block_3.name, type: "if", source: "(68:25) ", ctx });
    	return block;
    }

    // (66:6) {#if close}
    function create_if_block_2(ctx) {
    	var span;

    	const block = {
    		c: function create() {
    			span = element("span");
    			span.textContent = "×";
    			attr_dev(span, "aria-hidden", "true");
    			add_location(span, file, 66, 8, 1264);
    		},

    		m: function mount(target, anchor) {
    			insert_dev(target, span, anchor);
    		},

    		p: noop,
    		i: noop,
    		o: noop,

    		d: function destroy(detaching) {
    			if (detaching) {
    				detach_dev(span);
    			}
    		}
    	};
    	dispatch_dev("SvelteRegisterBlock", { block, id: create_if_block_2.name, type: "if", source: "(66:6) {#if close}", ctx });
    	return block;
    }

    // (50:4) {:else}
    function create_else_block$1(ctx) {
    	var current;

    	const default_slot_template = ctx.$$slots.default;
    	const default_slot = create_slot(default_slot_template, ctx, null);

    	const block = {
    		c: function create() {
    			if (default_slot) default_slot.c();
    		},

    		l: function claim(nodes) {
    			if (default_slot) default_slot.l(nodes);
    		},

    		m: function mount(target, anchor) {
    			if (default_slot) {
    				default_slot.m(target, anchor);
    			}

    			current = true;
    		},

    		p: function update(changed, ctx) {
    			if (default_slot && default_slot.p && changed.$$scope) {
    				default_slot.p(
    					get_slot_changes(default_slot_template, ctx, changed, null),
    					get_slot_context(default_slot_template, ctx, null)
    				);
    			}
    		},

    		i: function intro(local) {
    			if (current) return;
    			transition_in(default_slot, local);
    			current = true;
    		},

    		o: function outro(local) {
    			transition_out(default_slot, local);
    			current = false;
    		},

    		d: function destroy(detaching) {
    			if (default_slot) default_slot.d(detaching);
    		}
    	};
    	dispatch_dev("SvelteRegisterBlock", { block, id: create_else_block$1.name, type: "else", source: "(50:4) {:else}", ctx });
    	return block;
    }

    // (48:4) {#if children}
    function create_if_block_1$1(ctx) {
    	var t;

    	const block = {
    		c: function create() {
    			t = text(ctx.children);
    		},

    		m: function mount(target, anchor) {
    			insert_dev(target, t, anchor);
    		},

    		p: function update(changed, ctx) {
    			if (changed.children) {
    				set_data_dev(t, ctx.children);
    			}
    		},

    		i: noop,
    		o: noop,

    		d: function destroy(detaching) {
    			if (detaching) {
    				detach_dev(t);
    			}
    		}
    	};
    	dispatch_dev("SvelteRegisterBlock", { block, id: create_if_block_1$1.name, type: "if", source: "(48:4) {#if children}", ctx });
    	return block;
    }

    function create_fragment$2(ctx) {
    	var current_block_type_index, if_block, if_block_anchor, current;

    	var if_block_creators = [
    		create_if_block$1,
    		create_else_block_1
    	];

    	var if_blocks = [];

    	function select_block_type(changed, ctx) {
    		if (ctx.href) return 0;
    		return 1;
    	}

    	current_block_type_index = select_block_type(null, ctx);
    	if_block = if_blocks[current_block_type_index] = if_block_creators[current_block_type_index](ctx);

    	const block = {
    		c: function create() {
    			if_block.c();
    			if_block_anchor = empty();
    		},

    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},

    		m: function mount(target, anchor) {
    			if_blocks[current_block_type_index].m(target, anchor);
    			insert_dev(target, if_block_anchor, anchor);
    			current = true;
    		},

    		p: function update(changed, ctx) {
    			var previous_block_index = current_block_type_index;
    			current_block_type_index = select_block_type(changed, ctx);
    			if (current_block_type_index === previous_block_index) {
    				if_blocks[current_block_type_index].p(changed, ctx);
    			} else {
    				group_outros();
    				transition_out(if_blocks[previous_block_index], 1, 1, () => {
    					if_blocks[previous_block_index] = null;
    				});
    				check_outros();

    				if_block = if_blocks[current_block_type_index];
    				if (!if_block) {
    					if_block = if_blocks[current_block_type_index] = if_block_creators[current_block_type_index](ctx);
    					if_block.c();
    				}
    				transition_in(if_block, 1);
    				if_block.m(if_block_anchor.parentNode, if_block_anchor);
    			}
    		},

    		i: function intro(local) {
    			if (current) return;
    			transition_in(if_block);
    			current = true;
    		},

    		o: function outro(local) {
    			transition_out(if_block);
    			current = false;
    		},

    		d: function destroy(detaching) {
    			if_blocks[current_block_type_index].d(detaching);

    			if (detaching) {
    				detach_dev(if_block_anchor);
    			}
    		}
    	};
    	dispatch_dev("SvelteRegisterBlock", { block, id: create_fragment$2.name, type: "component", source: "", ctx });
    	return block;
    }

    function instance$2($$self, $$props, $$invalidate) {
    	

      let { class: className = '', active = false, block = false, children = undefined, close = false, color = 'secondary', disabled = false, href = '', id = '', outline = false, size = '', style = '', value = '' } = $$props;

      const props = clean($$props);

    	let { $$slots = {}, $$scope } = $$props;

    	function click_handler(event) {
    		bubble($$self, event);
    	}

    	function click_handler_1(event) {
    		bubble($$self, event);
    	}

    	$$self.$set = $$new_props => {
    		$$invalidate('$$props', $$props = assign(assign({}, $$props), $$new_props));
    		if ('class' in $$new_props) $$invalidate('className', className = $$new_props.class);
    		if ('active' in $$new_props) $$invalidate('active', active = $$new_props.active);
    		if ('block' in $$new_props) $$invalidate('block', block = $$new_props.block);
    		if ('children' in $$new_props) $$invalidate('children', children = $$new_props.children);
    		if ('close' in $$new_props) $$invalidate('close', close = $$new_props.close);
    		if ('color' in $$new_props) $$invalidate('color', color = $$new_props.color);
    		if ('disabled' in $$new_props) $$invalidate('disabled', disabled = $$new_props.disabled);
    		if ('href' in $$new_props) $$invalidate('href', href = $$new_props.href);
    		if ('id' in $$new_props) $$invalidate('id', id = $$new_props.id);
    		if ('outline' in $$new_props) $$invalidate('outline', outline = $$new_props.outline);
    		if ('size' in $$new_props) $$invalidate('size', size = $$new_props.size);
    		if ('style' in $$new_props) $$invalidate('style', style = $$new_props.style);
    		if ('value' in $$new_props) $$invalidate('value', value = $$new_props.value);
    		if ('$$scope' in $$new_props) $$invalidate('$$scope', $$scope = $$new_props.$$scope);
    	};

    	$$self.$capture_state = () => {
    		return { className, active, block, children, close, color, disabled, href, id, outline, size, style, value, ariaLabel, classes, defaultAriaLabel };
    	};

    	$$self.$inject_state = $$new_props => {
    		$$invalidate('$$props', $$props = assign(assign({}, $$props), $$new_props));
    		if ('className' in $$props) $$invalidate('className', className = $$new_props.className);
    		if ('active' in $$props) $$invalidate('active', active = $$new_props.active);
    		if ('block' in $$props) $$invalidate('block', block = $$new_props.block);
    		if ('children' in $$props) $$invalidate('children', children = $$new_props.children);
    		if ('close' in $$props) $$invalidate('close', close = $$new_props.close);
    		if ('color' in $$props) $$invalidate('color', color = $$new_props.color);
    		if ('disabled' in $$props) $$invalidate('disabled', disabled = $$new_props.disabled);
    		if ('href' in $$props) $$invalidate('href', href = $$new_props.href);
    		if ('id' in $$props) $$invalidate('id', id = $$new_props.id);
    		if ('outline' in $$props) $$invalidate('outline', outline = $$new_props.outline);
    		if ('size' in $$props) $$invalidate('size', size = $$new_props.size);
    		if ('style' in $$props) $$invalidate('style', style = $$new_props.style);
    		if ('value' in $$props) $$invalidate('value', value = $$new_props.value);
    		if ('ariaLabel' in $$props) $$invalidate('ariaLabel', ariaLabel = $$new_props.ariaLabel);
    		if ('classes' in $$props) $$invalidate('classes', classes = $$new_props.classes);
    		if ('defaultAriaLabel' in $$props) $$invalidate('defaultAriaLabel', defaultAriaLabel = $$new_props.defaultAriaLabel);
    	};

    	let ariaLabel, classes, defaultAriaLabel;

    	$$self.$$.update = ($$dirty = { $$props: 1, className: 1, close: 1, outline: 1, color: 1, size: 1, block: 1, active: 1 }) => {
    		$$invalidate('ariaLabel', ariaLabel = $$props['aria-label']);
    		if ($$dirty.className || $$dirty.close || $$dirty.outline || $$dirty.color || $$dirty.size || $$dirty.block || $$dirty.active) { $$invalidate('classes', classes = clsx(
            className,
            { close },
            close || 'btn',
            close || `btn${outline ? '-outline' : ''}-${color}`,
            size ? `btn-${size}` : false,
            block ? 'btn-block' : false,
            { active }
          )); }
    		if ($$dirty.close) { $$invalidate('defaultAriaLabel', defaultAriaLabel = close ? 'Close' : null); }
    	};

    	return {
    		className,
    		active,
    		block,
    		children,
    		close,
    		color,
    		disabled,
    		href,
    		id,
    		outline,
    		size,
    		style,
    		value,
    		props,
    		ariaLabel,
    		classes,
    		defaultAriaLabel,
    		click_handler,
    		click_handler_1,
    		$$props: $$props = exclude_internal_props($$props),
    		$$slots,
    		$$scope
    	};
    }

    class Button extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$2, create_fragment$2, safe_not_equal, ["class", "active", "block", "children", "close", "color", "disabled", "href", "id", "outline", "size", "style", "value"]);
    		dispatch_dev("SvelteRegisterComponent", { component: this, tagName: "Button", options, id: create_fragment$2.name });
    	}

    	get class() {
    		throw new Error("<Button>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set class(value) {
    		throw new Error("<Button>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get active() {
    		throw new Error("<Button>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set active(value) {
    		throw new Error("<Button>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get block() {
    		throw new Error("<Button>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set block(value) {
    		throw new Error("<Button>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get children() {
    		throw new Error("<Button>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set children(value) {
    		throw new Error("<Button>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get close() {
    		throw new Error("<Button>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set close(value) {
    		throw new Error("<Button>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get color() {
    		throw new Error("<Button>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set color(value) {
    		throw new Error("<Button>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get disabled() {
    		throw new Error("<Button>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set disabled(value) {
    		throw new Error("<Button>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get href() {
    		throw new Error("<Button>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set href(value) {
    		throw new Error("<Button>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get id() {
    		throw new Error("<Button>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set id(value) {
    		throw new Error("<Button>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get outline() {
    		throw new Error("<Button>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set outline(value) {
    		throw new Error("<Button>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get size() {
    		throw new Error("<Button>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set size(value) {
    		throw new Error("<Button>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get style() {
    		throw new Error("<Button>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set style(value) {
    		throw new Error("<Button>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get value() {
    		throw new Error("<Button>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set value(value) {
    		throw new Error("<Button>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* node_modules\sveltestrap\src\Collapse.svelte generated by Svelte v3.12.1 */

    const file$1 = "node_modules\\sveltestrap\\src\\Collapse.svelte";

    // (61:0) {#if isOpen}
    function create_if_block$2(ctx) {
    	var div, div_transition, current, dispose;

    	const default_slot_template = ctx.$$slots.default;
    	const default_slot = create_slot(default_slot_template, ctx, null);

    	var div_levels = [
    		{ class: ctx.classes },
    		ctx.props
    	];

    	var div_data = {};
    	for (var i = 0; i < div_levels.length; i += 1) {
    		div_data = assign(div_data, div_levels[i]);
    	}

    	const block = {
    		c: function create() {
    			div = element("div");

    			if (default_slot) default_slot.c();

    			set_attributes(div, div_data);
    			add_location(div, file$1, 61, 2, 1288);

    			dispose = [
    				listen_dev(div, "introstart", ctx.introstart_handler),
    				listen_dev(div, "introend", ctx.introend_handler),
    				listen_dev(div, "outrostart", ctx.outrostart_handler),
    				listen_dev(div, "outroend", ctx.outroend_handler),
    				listen_dev(div, "introstart", ctx.onEntering),
    				listen_dev(div, "introend", ctx.onEntered),
    				listen_dev(div, "outrostart", ctx.onExiting),
    				listen_dev(div, "outroend", ctx.onExited)
    			];
    		},

    		l: function claim(nodes) {
    			if (default_slot) default_slot.l(div_nodes);
    		},

    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);

    			if (default_slot) {
    				default_slot.m(div, null);
    			}

    			current = true;
    		},

    		p: function update(changed, ctx) {
    			if (default_slot && default_slot.p && changed.$$scope) {
    				default_slot.p(
    					get_slot_changes(default_slot_template, ctx, changed, null),
    					get_slot_context(default_slot_template, ctx, null)
    				);
    			}

    			set_attributes(div, get_spread_update(div_levels, [
    				(changed.classes) && { class: ctx.classes },
    				(changed.props) && ctx.props
    			]));
    		},

    		i: function intro(local) {
    			if (current) return;
    			transition_in(default_slot, local);

    			add_render_callback(() => {
    				if (!div_transition) div_transition = create_bidirectional_transition(div, slide, {}, true);
    				div_transition.run(1);
    			});

    			current = true;
    		},

    		o: function outro(local) {
    			transition_out(default_slot, local);

    			if (!div_transition) div_transition = create_bidirectional_transition(div, slide, {}, false);
    			div_transition.run(0);

    			current = false;
    		},

    		d: function destroy(detaching) {
    			if (detaching) {
    				detach_dev(div);
    			}

    			if (default_slot) default_slot.d(detaching);

    			if (detaching) {
    				if (div_transition) div_transition.end();
    			}

    			run_all(dispose);
    		}
    	};
    	dispatch_dev("SvelteRegisterBlock", { block, id: create_if_block$2.name, type: "if", source: "(61:0) {#if isOpen}", ctx });
    	return block;
    }

    function create_fragment$3(ctx) {
    	var if_block_anchor, current, dispose;

    	add_render_callback(ctx.onwindowresize);

    	var if_block = (ctx.isOpen) && create_if_block$2(ctx);

    	const block = {
    		c: function create() {
    			if (if_block) if_block.c();
    			if_block_anchor = empty();
    			dispose = listen_dev(window, "resize", ctx.onwindowresize);
    		},

    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},

    		m: function mount(target, anchor) {
    			if (if_block) if_block.m(target, anchor);
    			insert_dev(target, if_block_anchor, anchor);
    			current = true;
    		},

    		p: function update(changed, ctx) {
    			if (ctx.isOpen) {
    				if (if_block) {
    					if_block.p(changed, ctx);
    					transition_in(if_block, 1);
    				} else {
    					if_block = create_if_block$2(ctx);
    					if_block.c();
    					transition_in(if_block, 1);
    					if_block.m(if_block_anchor.parentNode, if_block_anchor);
    				}
    			} else if (if_block) {
    				group_outros();
    				transition_out(if_block, 1, 1, () => {
    					if_block = null;
    				});
    				check_outros();
    			}
    		},

    		i: function intro(local) {
    			if (current) return;
    			transition_in(if_block);
    			current = true;
    		},

    		o: function outro(local) {
    			transition_out(if_block);
    			current = false;
    		},

    		d: function destroy(detaching) {
    			if (if_block) if_block.d(detaching);

    			if (detaching) {
    				detach_dev(if_block_anchor);
    			}

    			dispose();
    		}
    	};
    	dispatch_dev("SvelteRegisterBlock", { block, id: create_fragment$3.name, type: "component", source: "", ctx });
    	return block;
    }

    function instance$3($$self, $$props, $$invalidate) {
    	
      const noop = () => undefined;

      let { isOpen = false, class: className = '', navbar = false, onEntering = noop, onEntered = noop, onExiting = noop, onExited = noop, expand = false } = $$props;

      const props = clean($$props);

      let windowWidth = 0;
      let _wasMaximazed = false;

      const minWidth = {};
      $$invalidate('minWidth', minWidth['xs'] = 0, minWidth);
      $$invalidate('minWidth', minWidth['sm'] = 576, minWidth);
      $$invalidate('minWidth', minWidth['md'] = 768, minWidth);
      $$invalidate('minWidth', minWidth['lg'] = 992, minWidth);
      $$invalidate('minWidth', minWidth['xl'] = 1200, minWidth);

      const dispatch = createEventDispatcher();

      function notify() {
        dispatch('update', {
          isOpen: isOpen
        });
      }

    	let { $$slots = {}, $$scope } = $$props;

    	function introstart_handler(event) {
    		bubble($$self, event);
    	}

    	function introend_handler(event) {
    		bubble($$self, event);
    	}

    	function outrostart_handler(event) {
    		bubble($$self, event);
    	}

    	function outroend_handler(event) {
    		bubble($$self, event);
    	}

    	function onwindowresize() {
    		windowWidth = window.innerWidth; $$invalidate('windowWidth', windowWidth);
    	}

    	$$self.$set = $$new_props => {
    		$$invalidate('$$props', $$props = assign(assign({}, $$props), $$new_props));
    		if ('isOpen' in $$new_props) $$invalidate('isOpen', isOpen = $$new_props.isOpen);
    		if ('class' in $$new_props) $$invalidate('className', className = $$new_props.class);
    		if ('navbar' in $$new_props) $$invalidate('navbar', navbar = $$new_props.navbar);
    		if ('onEntering' in $$new_props) $$invalidate('onEntering', onEntering = $$new_props.onEntering);
    		if ('onEntered' in $$new_props) $$invalidate('onEntered', onEntered = $$new_props.onEntered);
    		if ('onExiting' in $$new_props) $$invalidate('onExiting', onExiting = $$new_props.onExiting);
    		if ('onExited' in $$new_props) $$invalidate('onExited', onExited = $$new_props.onExited);
    		if ('expand' in $$new_props) $$invalidate('expand', expand = $$new_props.expand);
    		if ('$$scope' in $$new_props) $$invalidate('$$scope', $$scope = $$new_props.$$scope);
    	};

    	$$self.$capture_state = () => {
    		return { isOpen, className, navbar, onEntering, onEntered, onExiting, onExited, expand, windowWidth, _wasMaximazed, classes };
    	};

    	$$self.$inject_state = $$new_props => {
    		$$invalidate('$$props', $$props = assign(assign({}, $$props), $$new_props));
    		if ('isOpen' in $$props) $$invalidate('isOpen', isOpen = $$new_props.isOpen);
    		if ('className' in $$props) $$invalidate('className', className = $$new_props.className);
    		if ('navbar' in $$props) $$invalidate('navbar', navbar = $$new_props.navbar);
    		if ('onEntering' in $$props) $$invalidate('onEntering', onEntering = $$new_props.onEntering);
    		if ('onEntered' in $$props) $$invalidate('onEntered', onEntered = $$new_props.onEntered);
    		if ('onExiting' in $$props) $$invalidate('onExiting', onExiting = $$new_props.onExiting);
    		if ('onExited' in $$props) $$invalidate('onExited', onExited = $$new_props.onExited);
    		if ('expand' in $$props) $$invalidate('expand', expand = $$new_props.expand);
    		if ('windowWidth' in $$props) $$invalidate('windowWidth', windowWidth = $$new_props.windowWidth);
    		if ('_wasMaximazed' in $$props) $$invalidate('_wasMaximazed', _wasMaximazed = $$new_props._wasMaximazed);
    		if ('classes' in $$props) $$invalidate('classes', classes = $$new_props.classes);
    	};

    	let classes;

    	$$self.$$.update = ($$dirty = { className: 1, navbar: 1, expand: 1, windowWidth: 1, minWidth: 1, isOpen: 1, _wasMaximazed: 1 }) => {
    		if ($$dirty.className || $$dirty.navbar) { $$invalidate('classes', classes = clsx(
            className,
            // collapseClass,
            navbar && 'navbar-collapse',
          )); }
    		if ($$dirty.navbar || $$dirty.expand || $$dirty.windowWidth || $$dirty.minWidth || $$dirty.isOpen || $$dirty._wasMaximazed) { if (navbar && expand) {
            if (windowWidth >= minWidth[expand] && !isOpen) {
              $$invalidate('isOpen', isOpen = true);
              $$invalidate('_wasMaximazed', _wasMaximazed = true);
              notify();
            } else if (windowWidth < minWidth[expand] && _wasMaximazed) {
              $$invalidate('isOpen', isOpen = false);
              $$invalidate('_wasMaximazed', _wasMaximazed = false);
              notify();
            }
          } }
    	};

    	return {
    		isOpen,
    		className,
    		navbar,
    		onEntering,
    		onEntered,
    		onExiting,
    		onExited,
    		expand,
    		props,
    		windowWidth,
    		classes,
    		introstart_handler,
    		introend_handler,
    		outrostart_handler,
    		outroend_handler,
    		onwindowresize,
    		$$props: $$props = exclude_internal_props($$props),
    		$$slots,
    		$$scope
    	};
    }

    class Collapse extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$3, create_fragment$3, safe_not_equal, ["isOpen", "class", "navbar", "onEntering", "onEntered", "onExiting", "onExited", "expand"]);
    		dispatch_dev("SvelteRegisterComponent", { component: this, tagName: "Collapse", options, id: create_fragment$3.name });
    	}

    	get isOpen() {
    		throw new Error("<Collapse>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set isOpen(value) {
    		throw new Error("<Collapse>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get class() {
    		throw new Error("<Collapse>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set class(value) {
    		throw new Error("<Collapse>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get navbar() {
    		throw new Error("<Collapse>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set navbar(value) {
    		throw new Error("<Collapse>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get onEntering() {
    		throw new Error("<Collapse>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set onEntering(value) {
    		throw new Error("<Collapse>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get onEntered() {
    		throw new Error("<Collapse>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set onEntered(value) {
    		throw new Error("<Collapse>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get onExiting() {
    		throw new Error("<Collapse>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set onExiting(value) {
    		throw new Error("<Collapse>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get onExited() {
    		throw new Error("<Collapse>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set onExited(value) {
    		throw new Error("<Collapse>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get expand() {
    		throw new Error("<Collapse>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set expand(value) {
    		throw new Error("<Collapse>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* node_modules\sveltestrap\src\Nav.svelte generated by Svelte v3.12.1 */

    const file$2 = "node_modules\\sveltestrap\\src\\Nav.svelte";

    function create_fragment$4(ctx) {
    	var ul, current;

    	const default_slot_template = ctx.$$slots.default;
    	const default_slot = create_slot(default_slot_template, ctx, null);

    	var ul_levels = [
    		ctx.props,
    		{ class: ctx.classes }
    	];

    	var ul_data = {};
    	for (var i = 0; i < ul_levels.length; i += 1) {
    		ul_data = assign(ul_data, ul_levels[i]);
    	}

    	const block = {
    		c: function create() {
    			ul = element("ul");

    			if (default_slot) default_slot.c();

    			set_attributes(ul, ul_data);
    			add_location(ul, file$2, 42, 0, 994);
    		},

    		l: function claim(nodes) {
    			if (default_slot) default_slot.l(ul_nodes);
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},

    		m: function mount(target, anchor) {
    			insert_dev(target, ul, anchor);

    			if (default_slot) {
    				default_slot.m(ul, null);
    			}

    			current = true;
    		},

    		p: function update(changed, ctx) {
    			if (default_slot && default_slot.p && changed.$$scope) {
    				default_slot.p(
    					get_slot_changes(default_slot_template, ctx, changed, null),
    					get_slot_context(default_slot_template, ctx, null)
    				);
    			}

    			set_attributes(ul, get_spread_update(ul_levels, [
    				(changed.props) && ctx.props,
    				(changed.classes) && { class: ctx.classes }
    			]));
    		},

    		i: function intro(local) {
    			if (current) return;
    			transition_in(default_slot, local);
    			current = true;
    		},

    		o: function outro(local) {
    			transition_out(default_slot, local);
    			current = false;
    		},

    		d: function destroy(detaching) {
    			if (detaching) {
    				detach_dev(ul);
    			}

    			if (default_slot) default_slot.d(detaching);
    		}
    	};
    	dispatch_dev("SvelteRegisterBlock", { block, id: create_fragment$4.name, type: "component", source: "", ctx });
    	return block;
    }

    function getVerticalClass(vertical) {
      if (vertical === false) {
        return false;
      } else if (vertical === true || vertical === 'xs') {
        return 'flex-column';
      }
      return `flex-${vertical}-column`;
    }

    function instance$4($$self, $$props, $$invalidate) {
    	

      let { class: className = '', tabs = false, pills = false, vertical = false, horizontal = '', justified = false, fill = false, navbar = false, card = false } = $$props;

      const props = clean($$props);

    	let { $$slots = {}, $$scope } = $$props;

    	$$self.$set = $$new_props => {
    		$$invalidate('$$props', $$props = assign(assign({}, $$props), $$new_props));
    		if ('class' in $$new_props) $$invalidate('className', className = $$new_props.class);
    		if ('tabs' in $$new_props) $$invalidate('tabs', tabs = $$new_props.tabs);
    		if ('pills' in $$new_props) $$invalidate('pills', pills = $$new_props.pills);
    		if ('vertical' in $$new_props) $$invalidate('vertical', vertical = $$new_props.vertical);
    		if ('horizontal' in $$new_props) $$invalidate('horizontal', horizontal = $$new_props.horizontal);
    		if ('justified' in $$new_props) $$invalidate('justified', justified = $$new_props.justified);
    		if ('fill' in $$new_props) $$invalidate('fill', fill = $$new_props.fill);
    		if ('navbar' in $$new_props) $$invalidate('navbar', navbar = $$new_props.navbar);
    		if ('card' in $$new_props) $$invalidate('card', card = $$new_props.card);
    		if ('$$scope' in $$new_props) $$invalidate('$$scope', $$scope = $$new_props.$$scope);
    	};

    	$$self.$capture_state = () => {
    		return { className, tabs, pills, vertical, horizontal, justified, fill, navbar, card, classes };
    	};

    	$$self.$inject_state = $$new_props => {
    		$$invalidate('$$props', $$props = assign(assign({}, $$props), $$new_props));
    		if ('className' in $$props) $$invalidate('className', className = $$new_props.className);
    		if ('tabs' in $$props) $$invalidate('tabs', tabs = $$new_props.tabs);
    		if ('pills' in $$props) $$invalidate('pills', pills = $$new_props.pills);
    		if ('vertical' in $$props) $$invalidate('vertical', vertical = $$new_props.vertical);
    		if ('horizontal' in $$props) $$invalidate('horizontal', horizontal = $$new_props.horizontal);
    		if ('justified' in $$props) $$invalidate('justified', justified = $$new_props.justified);
    		if ('fill' in $$props) $$invalidate('fill', fill = $$new_props.fill);
    		if ('navbar' in $$props) $$invalidate('navbar', navbar = $$new_props.navbar);
    		if ('card' in $$props) $$invalidate('card', card = $$new_props.card);
    		if ('classes' in $$props) $$invalidate('classes', classes = $$new_props.classes);
    	};

    	let classes;

    	$$self.$$.update = ($$dirty = { className: 1, navbar: 1, horizontal: 1, vertical: 1, tabs: 1, card: 1, pills: 1, justified: 1, fill: 1 }) => {
    		if ($$dirty.className || $$dirty.navbar || $$dirty.horizontal || $$dirty.vertical || $$dirty.tabs || $$dirty.card || $$dirty.pills || $$dirty.justified || $$dirty.fill) { $$invalidate('classes', classes = clsx(
            className,
            navbar ? 'navbar-nav' : 'nav',
            horizontal ? `justify-content-${horizontal}` : false,
            getVerticalClass(vertical),
            {
              'nav-tabs': tabs,
              'card-header-tabs': card && tabs,
              'nav-pills': pills,
              'card-header-pills': card && pills,
              'nav-justified': justified,
              'nav-fill': fill,
            },
          )); }
    	};

    	return {
    		className,
    		tabs,
    		pills,
    		vertical,
    		horizontal,
    		justified,
    		fill,
    		navbar,
    		card,
    		props,
    		classes,
    		$$props: $$props = exclude_internal_props($$props),
    		$$slots,
    		$$scope
    	};
    }

    class Nav extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$4, create_fragment$4, safe_not_equal, ["class", "tabs", "pills", "vertical", "horizontal", "justified", "fill", "navbar", "card"]);
    		dispatch_dev("SvelteRegisterComponent", { component: this, tagName: "Nav", options, id: create_fragment$4.name });
    	}

    	get class() {
    		throw new Error("<Nav>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set class(value) {
    		throw new Error("<Nav>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get tabs() {
    		throw new Error("<Nav>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set tabs(value) {
    		throw new Error("<Nav>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get pills() {
    		throw new Error("<Nav>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set pills(value) {
    		throw new Error("<Nav>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get vertical() {
    		throw new Error("<Nav>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set vertical(value) {
    		throw new Error("<Nav>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get horizontal() {
    		throw new Error("<Nav>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set horizontal(value) {
    		throw new Error("<Nav>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get justified() {
    		throw new Error("<Nav>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set justified(value) {
    		throw new Error("<Nav>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get fill() {
    		throw new Error("<Nav>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set fill(value) {
    		throw new Error("<Nav>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get navbar() {
    		throw new Error("<Nav>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set navbar(value) {
    		throw new Error("<Nav>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get card() {
    		throw new Error("<Nav>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set card(value) {
    		throw new Error("<Nav>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* node_modules\sveltestrap\src\Navbar.svelte generated by Svelte v3.12.1 */

    const file$3 = "node_modules\\sveltestrap\\src\\Navbar.svelte";

    function create_fragment$5(ctx) {
    	var nav, current;

    	const default_slot_template = ctx.$$slots.default;
    	const default_slot = create_slot(default_slot_template, ctx, null);

    	var nav_levels = [
    		ctx.props,
    		{ class: ctx.classes }
    	];

    	var nav_data = {};
    	for (var i = 0; i < nav_levels.length; i += 1) {
    		nav_data = assign(nav_data, nav_levels[i]);
    	}

    	const block = {
    		c: function create() {
    			nav = element("nav");

    			if (default_slot) default_slot.c();

    			set_attributes(nav, nav_data);
    			add_location(nav, file$3, 41, 0, 849);
    		},

    		l: function claim(nodes) {
    			if (default_slot) default_slot.l(nav_nodes);
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},

    		m: function mount(target, anchor) {
    			insert_dev(target, nav, anchor);

    			if (default_slot) {
    				default_slot.m(nav, null);
    			}

    			current = true;
    		},

    		p: function update(changed, ctx) {
    			if (default_slot && default_slot.p && changed.$$scope) {
    				default_slot.p(
    					get_slot_changes(default_slot_template, ctx, changed, null),
    					get_slot_context(default_slot_template, ctx, null)
    				);
    			}

    			set_attributes(nav, get_spread_update(nav_levels, [
    				(changed.props) && ctx.props,
    				(changed.classes) && { class: ctx.classes }
    			]));
    		},

    		i: function intro(local) {
    			if (current) return;
    			transition_in(default_slot, local);
    			current = true;
    		},

    		o: function outro(local) {
    			transition_out(default_slot, local);
    			current = false;
    		},

    		d: function destroy(detaching) {
    			if (detaching) {
    				detach_dev(nav);
    			}

    			if (default_slot) default_slot.d(detaching);
    		}
    	};
    	dispatch_dev("SvelteRegisterBlock", { block, id: create_fragment$5.name, type: "component", source: "", ctx });
    	return block;
    }

    function getExpandClass(expand) {
      if (expand === false) {
        return false;
      } else if (expand === true || expand === 'xs') {
        return 'navbar-expand';
      }

      return `navbar-expand-${expand}`;
    }

    function instance$5($$self, $$props, $$invalidate) {
    	

      let { class: className = '', light = false, dark = false, full = false, fixed = '', sticky = '', color = '', role = '', expand = false } = $$props;

      const props = clean($$props);

    	let { $$slots = {}, $$scope } = $$props;

    	$$self.$set = $$new_props => {
    		$$invalidate('$$props', $$props = assign(assign({}, $$props), $$new_props));
    		if ('class' in $$new_props) $$invalidate('className', className = $$new_props.class);
    		if ('light' in $$new_props) $$invalidate('light', light = $$new_props.light);
    		if ('dark' in $$new_props) $$invalidate('dark', dark = $$new_props.dark);
    		if ('full' in $$new_props) $$invalidate('full', full = $$new_props.full);
    		if ('fixed' in $$new_props) $$invalidate('fixed', fixed = $$new_props.fixed);
    		if ('sticky' in $$new_props) $$invalidate('sticky', sticky = $$new_props.sticky);
    		if ('color' in $$new_props) $$invalidate('color', color = $$new_props.color);
    		if ('role' in $$new_props) $$invalidate('role', role = $$new_props.role);
    		if ('expand' in $$new_props) $$invalidate('expand', expand = $$new_props.expand);
    		if ('$$scope' in $$new_props) $$invalidate('$$scope', $$scope = $$new_props.$$scope);
    	};

    	$$self.$capture_state = () => {
    		return { className, light, dark, full, fixed, sticky, color, role, expand, classes };
    	};

    	$$self.$inject_state = $$new_props => {
    		$$invalidate('$$props', $$props = assign(assign({}, $$props), $$new_props));
    		if ('className' in $$props) $$invalidate('className', className = $$new_props.className);
    		if ('light' in $$props) $$invalidate('light', light = $$new_props.light);
    		if ('dark' in $$props) $$invalidate('dark', dark = $$new_props.dark);
    		if ('full' in $$props) $$invalidate('full', full = $$new_props.full);
    		if ('fixed' in $$props) $$invalidate('fixed', fixed = $$new_props.fixed);
    		if ('sticky' in $$props) $$invalidate('sticky', sticky = $$new_props.sticky);
    		if ('color' in $$props) $$invalidate('color', color = $$new_props.color);
    		if ('role' in $$props) $$invalidate('role', role = $$new_props.role);
    		if ('expand' in $$props) $$invalidate('expand', expand = $$new_props.expand);
    		if ('classes' in $$props) $$invalidate('classes', classes = $$new_props.classes);
    	};

    	let classes;

    	$$self.$$.update = ($$dirty = { className: 1, expand: 1, light: 1, dark: 1, color: 1, fixed: 1, sticky: 1 }) => {
    		if ($$dirty.className || $$dirty.expand || $$dirty.light || $$dirty.dark || $$dirty.color || $$dirty.fixed || $$dirty.sticky) { $$invalidate('classes', classes = clsx(
            className,
            'navbar',
            getExpandClass(expand),
            {
              'navbar-light': light,
              'navbar-dark': dark,
              [`bg-${color}`]: color,
              [`fixed-${fixed}`]: fixed,
              [`sticky-${sticky}`]: sticky,
            },
          )); }
    	};

    	return {
    		className,
    		light,
    		dark,
    		full,
    		fixed,
    		sticky,
    		color,
    		role,
    		expand,
    		props,
    		classes,
    		$$props: $$props = exclude_internal_props($$props),
    		$$slots,
    		$$scope
    	};
    }

    class Navbar extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$5, create_fragment$5, safe_not_equal, ["class", "light", "dark", "full", "fixed", "sticky", "color", "role", "expand"]);
    		dispatch_dev("SvelteRegisterComponent", { component: this, tagName: "Navbar", options, id: create_fragment$5.name });
    	}

    	get class() {
    		throw new Error("<Navbar>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set class(value) {
    		throw new Error("<Navbar>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get light() {
    		throw new Error("<Navbar>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set light(value) {
    		throw new Error("<Navbar>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get dark() {
    		throw new Error("<Navbar>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set dark(value) {
    		throw new Error("<Navbar>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get full() {
    		throw new Error("<Navbar>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set full(value) {
    		throw new Error("<Navbar>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get fixed() {
    		throw new Error("<Navbar>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set fixed(value) {
    		throw new Error("<Navbar>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get sticky() {
    		throw new Error("<Navbar>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set sticky(value) {
    		throw new Error("<Navbar>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get color() {
    		throw new Error("<Navbar>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set color(value) {
    		throw new Error("<Navbar>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get role() {
    		throw new Error("<Navbar>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set role(value) {
    		throw new Error("<Navbar>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get expand() {
    		throw new Error("<Navbar>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set expand(value) {
    		throw new Error("<Navbar>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* node_modules\sveltestrap\src\NavItem.svelte generated by Svelte v3.12.1 */

    const file$4 = "node_modules\\sveltestrap\\src\\NavItem.svelte";

    function create_fragment$6(ctx) {
    	var li, current;

    	const default_slot_template = ctx.$$slots.default;
    	const default_slot = create_slot(default_slot_template, ctx, null);

    	var li_levels = [
    		ctx.props,
    		{ class: ctx.classes }
    	];

    	var li_data = {};
    	for (var i = 0; i < li_levels.length; i += 1) {
    		li_data = assign(li_data, li_levels[i]);
    	}

    	const block = {
    		c: function create() {
    			li = element("li");

    			if (default_slot) default_slot.c();

    			set_attributes(li, li_data);
    			add_location(li, file$4, 17, 0, 286);
    		},

    		l: function claim(nodes) {
    			if (default_slot) default_slot.l(li_nodes);
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},

    		m: function mount(target, anchor) {
    			insert_dev(target, li, anchor);

    			if (default_slot) {
    				default_slot.m(li, null);
    			}

    			current = true;
    		},

    		p: function update(changed, ctx) {
    			if (default_slot && default_slot.p && changed.$$scope) {
    				default_slot.p(
    					get_slot_changes(default_slot_template, ctx, changed, null),
    					get_slot_context(default_slot_template, ctx, null)
    				);
    			}

    			set_attributes(li, get_spread_update(li_levels, [
    				(changed.props) && ctx.props,
    				(changed.classes) && { class: ctx.classes }
    			]));
    		},

    		i: function intro(local) {
    			if (current) return;
    			transition_in(default_slot, local);
    			current = true;
    		},

    		o: function outro(local) {
    			transition_out(default_slot, local);
    			current = false;
    		},

    		d: function destroy(detaching) {
    			if (detaching) {
    				detach_dev(li);
    			}

    			if (default_slot) default_slot.d(detaching);
    		}
    	};
    	dispatch_dev("SvelteRegisterBlock", { block, id: create_fragment$6.name, type: "component", source: "", ctx });
    	return block;
    }

    function instance$6($$self, $$props, $$invalidate) {
    	

      let { class: className = '', active = false } = $$props;

      const props = clean($$props);

    	let { $$slots = {}, $$scope } = $$props;

    	$$self.$set = $$new_props => {
    		$$invalidate('$$props', $$props = assign(assign({}, $$props), $$new_props));
    		if ('class' in $$new_props) $$invalidate('className', className = $$new_props.class);
    		if ('active' in $$new_props) $$invalidate('active', active = $$new_props.active);
    		if ('$$scope' in $$new_props) $$invalidate('$$scope', $$scope = $$new_props.$$scope);
    	};

    	$$self.$capture_state = () => {
    		return { className, active, classes };
    	};

    	$$self.$inject_state = $$new_props => {
    		$$invalidate('$$props', $$props = assign(assign({}, $$props), $$new_props));
    		if ('className' in $$props) $$invalidate('className', className = $$new_props.className);
    		if ('active' in $$props) $$invalidate('active', active = $$new_props.active);
    		if ('classes' in $$props) $$invalidate('classes', classes = $$new_props.classes);
    	};

    	let classes;

    	$$self.$$.update = ($$dirty = { className: 1, active: 1 }) => {
    		if ($$dirty.className || $$dirty.active) { $$invalidate('classes', classes = clsx(
            className,
            'nav-item',
            active ? 'active' : false
          )); }
    	};

    	return {
    		className,
    		active,
    		props,
    		classes,
    		$$props: $$props = exclude_internal_props($$props),
    		$$slots,
    		$$scope
    	};
    }

    class NavItem extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$6, create_fragment$6, safe_not_equal, ["class", "active"]);
    		dispatch_dev("SvelteRegisterComponent", { component: this, tagName: "NavItem", options, id: create_fragment$6.name });
    	}

    	get class() {
    		throw new Error("<NavItem>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set class(value) {
    		throw new Error("<NavItem>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get active() {
    		throw new Error("<NavItem>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set active(value) {
    		throw new Error("<NavItem>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* node_modules\sveltestrap\src\NavLink.svelte generated by Svelte v3.12.1 */

    const file$5 = "node_modules\\sveltestrap\\src\\NavLink.svelte";

    function create_fragment$7(ctx) {
    	var a, current, dispose;

    	const default_slot_template = ctx.$$slots.default;
    	const default_slot = create_slot(default_slot_template, ctx, null);

    	var a_levels = [
    		ctx.props,
    		{ href: ctx.href },
    		{ class: ctx.classes }
    	];

    	var a_data = {};
    	for (var i = 0; i < a_levels.length; i += 1) {
    		a_data = assign(a_data, a_levels[i]);
    	}

    	const block = {
    		c: function create() {
    			a = element("a");

    			if (default_slot) default_slot.c();

    			set_attributes(a, a_data);
    			add_location(a, file$5, 34, 0, 545);

    			dispose = [
    				listen_dev(a, "click", ctx.click_handler),
    				listen_dev(a, "click", ctx.handleClick)
    			];
    		},

    		l: function claim(nodes) {
    			if (default_slot) default_slot.l(a_nodes);
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},

    		m: function mount(target, anchor) {
    			insert_dev(target, a, anchor);

    			if (default_slot) {
    				default_slot.m(a, null);
    			}

    			current = true;
    		},

    		p: function update(changed, ctx) {
    			if (default_slot && default_slot.p && changed.$$scope) {
    				default_slot.p(
    					get_slot_changes(default_slot_template, ctx, changed, null),
    					get_slot_context(default_slot_template, ctx, null)
    				);
    			}

    			set_attributes(a, get_spread_update(a_levels, [
    				(changed.props) && ctx.props,
    				(changed.href) && { href: ctx.href },
    				(changed.classes) && { class: ctx.classes }
    			]));
    		},

    		i: function intro(local) {
    			if (current) return;
    			transition_in(default_slot, local);
    			current = true;
    		},

    		o: function outro(local) {
    			transition_out(default_slot, local);
    			current = false;
    		},

    		d: function destroy(detaching) {
    			if (detaching) {
    				detach_dev(a);
    			}

    			if (default_slot) default_slot.d(detaching);
    			run_all(dispose);
    		}
    	};
    	dispatch_dev("SvelteRegisterBlock", { block, id: create_fragment$7.name, type: "component", source: "", ctx });
    	return block;
    }

    function instance$7($$self, $$props, $$invalidate) {
    	

      let { class: className = '', disabled = false, active = false, href = '#' } = $$props;

      const props = clean($$props);

      function handleClick(e){
        if (disabled) {
          e.preventDefault();
          e.stopImmediatePropagation();
          return;
        }

        if (href === '#') {
          e.preventDefault();
        }
      }

    	let { $$slots = {}, $$scope } = $$props;

    	function click_handler(event) {
    		bubble($$self, event);
    	}

    	$$self.$set = $$new_props => {
    		$$invalidate('$$props', $$props = assign(assign({}, $$props), $$new_props));
    		if ('class' in $$new_props) $$invalidate('className', className = $$new_props.class);
    		if ('disabled' in $$new_props) $$invalidate('disabled', disabled = $$new_props.disabled);
    		if ('active' in $$new_props) $$invalidate('active', active = $$new_props.active);
    		if ('href' in $$new_props) $$invalidate('href', href = $$new_props.href);
    		if ('$$scope' in $$new_props) $$invalidate('$$scope', $$scope = $$new_props.$$scope);
    	};

    	$$self.$capture_state = () => {
    		return { className, disabled, active, href, classes };
    	};

    	$$self.$inject_state = $$new_props => {
    		$$invalidate('$$props', $$props = assign(assign({}, $$props), $$new_props));
    		if ('className' in $$props) $$invalidate('className', className = $$new_props.className);
    		if ('disabled' in $$props) $$invalidate('disabled', disabled = $$new_props.disabled);
    		if ('active' in $$props) $$invalidate('active', active = $$new_props.active);
    		if ('href' in $$props) $$invalidate('href', href = $$new_props.href);
    		if ('classes' in $$props) $$invalidate('classes', classes = $$new_props.classes);
    	};

    	let classes;

    	$$self.$$.update = ($$dirty = { className: 1, disabled: 1, active: 1 }) => {
    		if ($$dirty.className || $$dirty.disabled || $$dirty.active) { $$invalidate('classes', classes = clsx(
            className,
            'nav-link',
            {
              disabled,
              active
            },
          )); }
    	};

    	return {
    		className,
    		disabled,
    		active,
    		href,
    		props,
    		handleClick,
    		classes,
    		click_handler,
    		$$props: $$props = exclude_internal_props($$props),
    		$$slots,
    		$$scope
    	};
    }

    class NavLink extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$7, create_fragment$7, safe_not_equal, ["class", "disabled", "active", "href"]);
    		dispatch_dev("SvelteRegisterComponent", { component: this, tagName: "NavLink", options, id: create_fragment$7.name });
    	}

    	get class() {
    		throw new Error("<NavLink>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set class(value) {
    		throw new Error("<NavLink>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get disabled() {
    		throw new Error("<NavLink>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set disabled(value) {
    		throw new Error("<NavLink>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get active() {
    		throw new Error("<NavLink>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set active(value) {
    		throw new Error("<NavLink>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get href() {
    		throw new Error("<NavLink>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set href(value) {
    		throw new Error("<NavLink>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* node_modules\sveltestrap\src\NavbarBrand.svelte generated by Svelte v3.12.1 */

    const file$6 = "node_modules\\sveltestrap\\src\\NavbarBrand.svelte";

    function create_fragment$8(ctx) {
    	var a, current;

    	const default_slot_template = ctx.$$slots.default;
    	const default_slot = create_slot(default_slot_template, ctx, null);

    	var a_levels = [
    		ctx.props,
    		{ class: ctx.classes },
    		{ href: ctx.href }
    	];

    	var a_data = {};
    	for (var i = 0; i < a_levels.length; i += 1) {
    		a_data = assign(a_data, a_levels[i]);
    	}

    	const block = {
    		c: function create() {
    			a = element("a");

    			if (default_slot) default_slot.c();

    			set_attributes(a, a_data);
    			add_location(a, file$6, 16, 0, 256);
    		},

    		l: function claim(nodes) {
    			if (default_slot) default_slot.l(a_nodes);
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},

    		m: function mount(target, anchor) {
    			insert_dev(target, a, anchor);

    			if (default_slot) {
    				default_slot.m(a, null);
    			}

    			current = true;
    		},

    		p: function update(changed, ctx) {
    			if (default_slot && default_slot.p && changed.$$scope) {
    				default_slot.p(
    					get_slot_changes(default_slot_template, ctx, changed, null),
    					get_slot_context(default_slot_template, ctx, null)
    				);
    			}

    			set_attributes(a, get_spread_update(a_levels, [
    				(changed.props) && ctx.props,
    				(changed.classes) && { class: ctx.classes },
    				(changed.href) && { href: ctx.href }
    			]));
    		},

    		i: function intro(local) {
    			if (current) return;
    			transition_in(default_slot, local);
    			current = true;
    		},

    		o: function outro(local) {
    			transition_out(default_slot, local);
    			current = false;
    		},

    		d: function destroy(detaching) {
    			if (detaching) {
    				detach_dev(a);
    			}

    			if (default_slot) default_slot.d(detaching);
    		}
    	};
    	dispatch_dev("SvelteRegisterBlock", { block, id: create_fragment$8.name, type: "component", source: "", ctx });
    	return block;
    }

    function instance$8($$self, $$props, $$invalidate) {
    	

      let { class: className = '', href = '/' } = $$props;

      const props = clean($$props);

    	let { $$slots = {}, $$scope } = $$props;

    	$$self.$set = $$new_props => {
    		$$invalidate('$$props', $$props = assign(assign({}, $$props), $$new_props));
    		if ('class' in $$new_props) $$invalidate('className', className = $$new_props.class);
    		if ('href' in $$new_props) $$invalidate('href', href = $$new_props.href);
    		if ('$$scope' in $$new_props) $$invalidate('$$scope', $$scope = $$new_props.$$scope);
    	};

    	$$self.$capture_state = () => {
    		return { className, href, classes };
    	};

    	$$self.$inject_state = $$new_props => {
    		$$invalidate('$$props', $$props = assign(assign({}, $$props), $$new_props));
    		if ('className' in $$props) $$invalidate('className', className = $$new_props.className);
    		if ('href' in $$props) $$invalidate('href', href = $$new_props.href);
    		if ('classes' in $$props) $$invalidate('classes', classes = $$new_props.classes);
    	};

    	let classes;

    	$$self.$$.update = ($$dirty = { className: 1 }) => {
    		if ($$dirty.className) { $$invalidate('classes', classes = clsx(
            className,
            'navbar-brand',
          )); }
    	};

    	return {
    		className,
    		href,
    		props,
    		classes,
    		$$props: $$props = exclude_internal_props($$props),
    		$$slots,
    		$$scope
    	};
    }

    class NavbarBrand extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$8, create_fragment$8, safe_not_equal, ["class", "href"]);
    		dispatch_dev("SvelteRegisterComponent", { component: this, tagName: "NavbarBrand", options, id: create_fragment$8.name });
    	}

    	get class() {
    		throw new Error("<NavbarBrand>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set class(value) {
    		throw new Error("<NavbarBrand>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get href() {
    		throw new Error("<NavbarBrand>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set href(value) {
    		throw new Error("<NavbarBrand>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* node_modules\sveltestrap\src\NavbarToggler.svelte generated by Svelte v3.12.1 */

    const file$7 = "node_modules\\sveltestrap\\src\\NavbarToggler.svelte";

    // (19:0) <Button {...props} on:click class="{classes}">
    function create_default_slot(ctx) {
    	var span, current;

    	const default_slot_template = ctx.$$slots.default;
    	const default_slot = create_slot(default_slot_template, ctx, null);

    	const block = {
    		c: function create() {
    			if (!default_slot) {
    				span = element("span");
    			}

    			if (default_slot) default_slot.c();
    			if (!default_slot) {
    				attr_dev(span, "class", "navbar-toggler-icon");
    				add_location(span, file$7, 20, 4, 364);
    			}
    		},

    		l: function claim(nodes) {
    			if (default_slot) default_slot.l(nodes);
    		},

    		m: function mount(target, anchor) {
    			if (!default_slot) {
    				insert_dev(target, span, anchor);
    			}

    			else {
    				default_slot.m(target, anchor);
    			}

    			current = true;
    		},

    		p: function update(changed, ctx) {
    			if (default_slot && default_slot.p && changed.$$scope) {
    				default_slot.p(
    					get_slot_changes(default_slot_template, ctx, changed, null),
    					get_slot_context(default_slot_template, ctx, null)
    				);
    			}
    		},

    		i: function intro(local) {
    			if (current) return;
    			transition_in(default_slot, local);
    			current = true;
    		},

    		o: function outro(local) {
    			transition_out(default_slot, local);
    			current = false;
    		},

    		d: function destroy(detaching) {
    			if (!default_slot) {
    				if (detaching) {
    					detach_dev(span);
    				}
    			}

    			if (default_slot) default_slot.d(detaching);
    		}
    	};
    	dispatch_dev("SvelteRegisterBlock", { block, id: create_default_slot.name, type: "slot", source: "(19:0) <Button {...props} on:click class=\"{classes}\">", ctx });
    	return block;
    }

    function create_fragment$9(ctx) {
    	var current;

    	var button_spread_levels = [
    		ctx.props,
    		{ class: ctx.classes }
    	];

    	let button_props = {
    		$$slots: { default: [create_default_slot] },
    		$$scope: { ctx }
    	};
    	for (var i = 0; i < button_spread_levels.length; i += 1) {
    		button_props = assign(button_props, button_spread_levels[i]);
    	}
    	var button = new Button({ props: button_props, $$inline: true });
    	button.$on("click", ctx.click_handler);

    	const block = {
    		c: function create() {
    			button.$$.fragment.c();
    		},

    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},

    		m: function mount(target, anchor) {
    			mount_component(button, target, anchor);
    			current = true;
    		},

    		p: function update(changed, ctx) {
    			var button_changes = (changed.props || changed.classes) ? get_spread_update(button_spread_levels, [
    									(changed.props) && get_spread_object(ctx.props),
    			(changed.classes) && { class: ctx.classes }
    								]) : {};
    			if (changed.$$scope) button_changes.$$scope = { changed, ctx };
    			button.$set(button_changes);
    		},

    		i: function intro(local) {
    			if (current) return;
    			transition_in(button.$$.fragment, local);

    			current = true;
    		},

    		o: function outro(local) {
    			transition_out(button.$$.fragment, local);
    			current = false;
    		},

    		d: function destroy(detaching) {
    			destroy_component(button, detaching);
    		}
    	};
    	dispatch_dev("SvelteRegisterBlock", { block, id: create_fragment$9.name, type: "component", source: "", ctx });
    	return block;
    }

    function instance$9($$self, $$props, $$invalidate) {
    	

      let { class: className = '', type = 'button' } = $$props;

      const props = clean($$props);

    	let { $$slots = {}, $$scope } = $$props;

    	function click_handler(event) {
    		bubble($$self, event);
    	}

    	$$self.$set = $$new_props => {
    		$$invalidate('$$props', $$props = assign(assign({}, $$props), $$new_props));
    		if ('class' in $$new_props) $$invalidate('className', className = $$new_props.class);
    		if ('type' in $$new_props) $$invalidate('type', type = $$new_props.type);
    		if ('$$scope' in $$new_props) $$invalidate('$$scope', $$scope = $$new_props.$$scope);
    	};

    	$$self.$capture_state = () => {
    		return { className, type, classes };
    	};

    	$$self.$inject_state = $$new_props => {
    		$$invalidate('$$props', $$props = assign(assign({}, $$props), $$new_props));
    		if ('className' in $$props) $$invalidate('className', className = $$new_props.className);
    		if ('type' in $$props) $$invalidate('type', type = $$new_props.type);
    		if ('classes' in $$props) $$invalidate('classes', classes = $$new_props.classes);
    	};

    	let classes;

    	$$self.$$.update = ($$dirty = { className: 1 }) => {
    		if ($$dirty.className) { $$invalidate('classes', classes = clsx(
            className,
            'navbar-toggler',
          )); }
    	};

    	return {
    		className,
    		type,
    		props,
    		classes,
    		click_handler,
    		$$props: $$props = exclude_internal_props($$props),
    		$$slots,
    		$$scope
    	};
    }

    class NavbarToggler extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$9, create_fragment$9, safe_not_equal, ["class", "type"]);
    		dispatch_dev("SvelteRegisterComponent", { component: this, tagName: "NavbarToggler", options, id: create_fragment$9.name });
    	}

    	get class() {
    		throw new Error("<NavbarToggler>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set class(value) {
    		throw new Error("<NavbarToggler>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get type() {
    		throw new Error("<NavbarToggler>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set type(value) {
    		throw new Error("<NavbarToggler>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* node_modules\sveltestrap\src\Pagination.svelte generated by Svelte v3.12.1 */

    const file$8 = "node_modules\\sveltestrap\\src\\Pagination.svelte";

    function create_fragment$a(ctx) {
    	var nav, ul, current;

    	const default_slot_template = ctx.$$slots.default;
    	const default_slot = create_slot(default_slot_template, ctx, null);

    	var nav_levels = [
    		ctx.props,
    		{ class: ctx.classes },
    		{ "aria-label": ctx.ariaLabel }
    	];

    	var nav_data = {};
    	for (var i = 0; i < nav_levels.length; i += 1) {
    		nav_data = assign(nav_data, nav_levels[i]);
    	}

    	const block = {
    		c: function create() {
    			nav = element("nav");
    			ul = element("ul");

    			if (default_slot) default_slot.c();

    			attr_dev(ul, "class", ctx.listClasses);
    			add_location(ul, file$8, 26, 2, 487);
    			set_attributes(nav, nav_data);
    			add_location(nav, file$8, 25, 0, 425);
    		},

    		l: function claim(nodes) {
    			if (default_slot) default_slot.l(ul_nodes);
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},

    		m: function mount(target, anchor) {
    			insert_dev(target, nav, anchor);
    			append_dev(nav, ul);

    			if (default_slot) {
    				default_slot.m(ul, null);
    			}

    			current = true;
    		},

    		p: function update(changed, ctx) {
    			if (default_slot && default_slot.p && changed.$$scope) {
    				default_slot.p(
    					get_slot_changes(default_slot_template, ctx, changed, null),
    					get_slot_context(default_slot_template, ctx, null)
    				);
    			}

    			if (!current || changed.listClasses) {
    				attr_dev(ul, "class", ctx.listClasses);
    			}

    			set_attributes(nav, get_spread_update(nav_levels, [
    				(changed.props) && ctx.props,
    				(changed.classes) && { class: ctx.classes },
    				(changed.ariaLabel) && { "aria-label": ctx.ariaLabel }
    			]));
    		},

    		i: function intro(local) {
    			if (current) return;
    			transition_in(default_slot, local);
    			current = true;
    		},

    		o: function outro(local) {
    			transition_out(default_slot, local);
    			current = false;
    		},

    		d: function destroy(detaching) {
    			if (detaching) {
    				detach_dev(nav);
    			}

    			if (default_slot) default_slot.d(detaching);
    		}
    	};
    	dispatch_dev("SvelteRegisterBlock", { block, id: create_fragment$a.name, type: "component", source: "", ctx });
    	return block;
    }

    function instance$a($$self, $$props, $$invalidate) {
    	

      let { class: className = '', listClassName = '', size = '', ariaLabel = 'pagination' } = $$props;

      const props = clean($$props);

    	let { $$slots = {}, $$scope } = $$props;

    	$$self.$set = $$new_props => {
    		$$invalidate('$$props', $$props = assign(assign({}, $$props), $$new_props));
    		if ('class' in $$new_props) $$invalidate('className', className = $$new_props.class);
    		if ('listClassName' in $$new_props) $$invalidate('listClassName', listClassName = $$new_props.listClassName);
    		if ('size' in $$new_props) $$invalidate('size', size = $$new_props.size);
    		if ('ariaLabel' in $$new_props) $$invalidate('ariaLabel', ariaLabel = $$new_props.ariaLabel);
    		if ('$$scope' in $$new_props) $$invalidate('$$scope', $$scope = $$new_props.$$scope);
    	};

    	$$self.$capture_state = () => {
    		return { className, listClassName, size, ariaLabel, classes, listClasses };
    	};

    	$$self.$inject_state = $$new_props => {
    		$$invalidate('$$props', $$props = assign(assign({}, $$props), $$new_props));
    		if ('className' in $$props) $$invalidate('className', className = $$new_props.className);
    		if ('listClassName' in $$props) $$invalidate('listClassName', listClassName = $$new_props.listClassName);
    		if ('size' in $$props) $$invalidate('size', size = $$new_props.size);
    		if ('ariaLabel' in $$props) $$invalidate('ariaLabel', ariaLabel = $$new_props.ariaLabel);
    		if ('classes' in $$props) $$invalidate('classes', classes = $$new_props.classes);
    		if ('listClasses' in $$props) $$invalidate('listClasses', listClasses = $$new_props.listClasses);
    	};

    	let classes, listClasses;

    	$$self.$$.update = ($$dirty = { className: 1, listClassName: 1, size: 1 }) => {
    		if ($$dirty.className) { $$invalidate('classes', classes = clsx(
            className
          )); }
    		if ($$dirty.listClassName || $$dirty.size) { $$invalidate('listClasses', listClasses = clsx(
            listClassName,
            'pagination',
            {
              [`pagination-${size}`]: !!size,
            },
          )); }
    	};

    	return {
    		className,
    		listClassName,
    		size,
    		ariaLabel,
    		props,
    		classes,
    		listClasses,
    		$$props: $$props = exclude_internal_props($$props),
    		$$slots,
    		$$scope
    	};
    }

    class Pagination extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$a, create_fragment$a, safe_not_equal, ["class", "listClassName", "size", "ariaLabel"]);
    		dispatch_dev("SvelteRegisterComponent", { component: this, tagName: "Pagination", options, id: create_fragment$a.name });
    	}

    	get class() {
    		throw new Error("<Pagination>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set class(value) {
    		throw new Error("<Pagination>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get listClassName() {
    		throw new Error("<Pagination>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set listClassName(value) {
    		throw new Error("<Pagination>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get size() {
    		throw new Error("<Pagination>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set size(value) {
    		throw new Error("<Pagination>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get ariaLabel() {
    		throw new Error("<Pagination>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set ariaLabel(value) {
    		throw new Error("<Pagination>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* node_modules\sveltestrap\src\PaginationItem.svelte generated by Svelte v3.12.1 */

    const file$9 = "node_modules\\sveltestrap\\src\\PaginationItem.svelte";

    function create_fragment$b(ctx) {
    	var li, current;

    	const default_slot_template = ctx.$$slots.default;
    	const default_slot = create_slot(default_slot_template, ctx, null);

    	var li_levels = [
    		ctx.props,
    		{ class: ctx.classes }
    	];

    	var li_data = {};
    	for (var i = 0; i < li_levels.length; i += 1) {
    		li_data = assign(li_data, li_levels[i]);
    	}

    	const block = {
    		c: function create() {
    			li = element("li");

    			if (default_slot) default_slot.c();

    			set_attributes(li, li_data);
    			add_location(li, file$9, 21, 0, 331);
    		},

    		l: function claim(nodes) {
    			if (default_slot) default_slot.l(li_nodes);
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},

    		m: function mount(target, anchor) {
    			insert_dev(target, li, anchor);

    			if (default_slot) {
    				default_slot.m(li, null);
    			}

    			current = true;
    		},

    		p: function update(changed, ctx) {
    			if (default_slot && default_slot.p && changed.$$scope) {
    				default_slot.p(
    					get_slot_changes(default_slot_template, ctx, changed, null),
    					get_slot_context(default_slot_template, ctx, null)
    				);
    			}

    			set_attributes(li, get_spread_update(li_levels, [
    				(changed.props) && ctx.props,
    				(changed.classes) && { class: ctx.classes }
    			]));
    		},

    		i: function intro(local) {
    			if (current) return;
    			transition_in(default_slot, local);
    			current = true;
    		},

    		o: function outro(local) {
    			transition_out(default_slot, local);
    			current = false;
    		},

    		d: function destroy(detaching) {
    			if (detaching) {
    				detach_dev(li);
    			}

    			if (default_slot) default_slot.d(detaching);
    		}
    	};
    	dispatch_dev("SvelteRegisterBlock", { block, id: create_fragment$b.name, type: "component", source: "", ctx });
    	return block;
    }

    function instance$b($$self, $$props, $$invalidate) {
    	

      let { class: className = '', active = false, disabled = false } = $$props;

      const props = clean($$props);

    	let { $$slots = {}, $$scope } = $$props;

    	$$self.$set = $$new_props => {
    		$$invalidate('$$props', $$props = assign(assign({}, $$props), $$new_props));
    		if ('class' in $$new_props) $$invalidate('className', className = $$new_props.class);
    		if ('active' in $$new_props) $$invalidate('active', active = $$new_props.active);
    		if ('disabled' in $$new_props) $$invalidate('disabled', disabled = $$new_props.disabled);
    		if ('$$scope' in $$new_props) $$invalidate('$$scope', $$scope = $$new_props.$$scope);
    	};

    	$$self.$capture_state = () => {
    		return { className, active, disabled, classes };
    	};

    	$$self.$inject_state = $$new_props => {
    		$$invalidate('$$props', $$props = assign(assign({}, $$props), $$new_props));
    		if ('className' in $$props) $$invalidate('className', className = $$new_props.className);
    		if ('active' in $$props) $$invalidate('active', active = $$new_props.active);
    		if ('disabled' in $$props) $$invalidate('disabled', disabled = $$new_props.disabled);
    		if ('classes' in $$props) $$invalidate('classes', classes = $$new_props.classes);
    	};

    	let classes;

    	$$self.$$.update = ($$dirty = { className: 1, active: 1, disabled: 1 }) => {
    		if ($$dirty.className || $$dirty.active || $$dirty.disabled) { $$invalidate('classes', classes = clsx(
            className,
            'page-item',
            {
              active,
              disabled,
            },
          )); }
    	};

    	return {
    		className,
    		active,
    		disabled,
    		props,
    		classes,
    		$$props: $$props = exclude_internal_props($$props),
    		$$slots,
    		$$scope
    	};
    }

    class PaginationItem extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$b, create_fragment$b, safe_not_equal, ["class", "active", "disabled"]);
    		dispatch_dev("SvelteRegisterComponent", { component: this, tagName: "PaginationItem", options, id: create_fragment$b.name });
    	}

    	get class() {
    		throw new Error("<PaginationItem>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set class(value) {
    		throw new Error("<PaginationItem>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get active() {
    		throw new Error("<PaginationItem>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set active(value) {
    		throw new Error("<PaginationItem>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get disabled() {
    		throw new Error("<PaginationItem>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set disabled(value) {
    		throw new Error("<PaginationItem>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* node_modules\sveltestrap\src\PaginationLink.svelte generated by Svelte v3.12.1 */

    const file$a = "node_modules\\sveltestrap\\src\\PaginationLink.svelte";

    // (62:2) {:else}
    function create_else_block$2(ctx) {
    	var current;

    	const default_slot_template = ctx.$$slots.default;
    	const default_slot = create_slot(default_slot_template, ctx, null);

    	const block = {
    		c: function create() {
    			if (default_slot) default_slot.c();
    		},

    		l: function claim(nodes) {
    			if (default_slot) default_slot.l(nodes);
    		},

    		m: function mount(target, anchor) {
    			if (default_slot) {
    				default_slot.m(target, anchor);
    			}

    			current = true;
    		},

    		p: function update(changed, ctx) {
    			if (default_slot && default_slot.p && changed.$$scope) {
    				default_slot.p(
    					get_slot_changes(default_slot_template, ctx, changed, null),
    					get_slot_context(default_slot_template, ctx, null)
    				);
    			}
    		},

    		i: function intro(local) {
    			if (current) return;
    			transition_in(default_slot, local);
    			current = true;
    		},

    		o: function outro(local) {
    			transition_out(default_slot, local);
    			current = false;
    		},

    		d: function destroy(detaching) {
    			if (default_slot) default_slot.d(detaching);
    		}
    	};
    	dispatch_dev("SvelteRegisterBlock", { block, id: create_else_block$2.name, type: "else", source: "(62:2) {:else}", ctx });
    	return block;
    }

    // (53:2) {#if previous || next || first || last}
    function create_if_block$3(ctx) {
    	var span0, t0, t1, span1, t2, current;

    	const default_slot_template = ctx.$$slots.default;
    	const default_slot = create_slot(default_slot_template, ctx, null);

    	const block = {
    		c: function create() {
    			span0 = element("span");

    			if (!default_slot) {
    				t0 = text(ctx.defaultCaret);
    			}

    			if (default_slot) default_slot.c();
    			t1 = space();
    			span1 = element("span");
    			t2 = text(ctx.realLabel);

    			attr_dev(span0, "aria-hidden", "true");
    			add_location(span0, file$a, 53, 4, 1016);
    			attr_dev(span1, "class", "sr-only");
    			add_location(span1, file$a, 58, 4, 1108);
    		},

    		l: function claim(nodes) {
    			if (default_slot) default_slot.l(span0_nodes);
    		},

    		m: function mount(target, anchor) {
    			insert_dev(target, span0, anchor);

    			if (!default_slot) {
    				append_dev(span0, t0);
    			}

    			else {
    				default_slot.m(span0, null);
    			}

    			insert_dev(target, t1, anchor);
    			insert_dev(target, span1, anchor);
    			append_dev(span1, t2);
    			current = true;
    		},

    		p: function update(changed, ctx) {
    			if (!default_slot) {
    				if (!current || changed.defaultCaret) {
    					set_data_dev(t0, ctx.defaultCaret);
    				}
    			}

    			if (default_slot && default_slot.p && changed.$$scope) {
    				default_slot.p(
    					get_slot_changes(default_slot_template, ctx, changed, null),
    					get_slot_context(default_slot_template, ctx, null)
    				);
    			}

    			if (!current || changed.realLabel) {
    				set_data_dev(t2, ctx.realLabel);
    			}
    		},

    		i: function intro(local) {
    			if (current) return;
    			transition_in(default_slot, local);
    			current = true;
    		},

    		o: function outro(local) {
    			transition_out(default_slot, local);
    			current = false;
    		},

    		d: function destroy(detaching) {
    			if (detaching) {
    				detach_dev(span0);
    			}

    			if (default_slot) default_slot.d(detaching);

    			if (detaching) {
    				detach_dev(t1);
    				detach_dev(span1);
    			}
    		}
    	};
    	dispatch_dev("SvelteRegisterBlock", { block, id: create_if_block$3.name, type: "if", source: "(53:2) {#if previous || next || first || last}", ctx });
    	return block;
    }

    function create_fragment$c(ctx) {
    	var a, current_block_type_index, if_block, current, dispose;

    	var if_block_creators = [
    		create_if_block$3,
    		create_else_block$2
    	];

    	var if_blocks = [];

    	function select_block_type(changed, ctx) {
    		if (ctx.previous || ctx.next || ctx.first || ctx.last) return 0;
    		return 1;
    	}

    	current_block_type_index = select_block_type(null, ctx);
    	if_block = if_blocks[current_block_type_index] = if_block_creators[current_block_type_index](ctx);

    	var a_levels = [
    		ctx.props,
    		{ class: ctx.classes },
    		{ href: ctx.href }
    	];

    	var a_data = {};
    	for (var i = 0; i < a_levels.length; i += 1) {
    		a_data = assign(a_data, a_levels[i]);
    	}

    	const block = {
    		c: function create() {
    			a = element("a");
    			if_block.c();
    			set_attributes(a, a_data);
    			add_location(a, file$a, 46, 0, 912);
    			dispose = listen_dev(a, "click", ctx.click_handler);
    		},

    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},

    		m: function mount(target, anchor) {
    			insert_dev(target, a, anchor);
    			if_blocks[current_block_type_index].m(a, null);
    			current = true;
    		},

    		p: function update(changed, ctx) {
    			var previous_block_index = current_block_type_index;
    			current_block_type_index = select_block_type(changed, ctx);
    			if (current_block_type_index === previous_block_index) {
    				if_blocks[current_block_type_index].p(changed, ctx);
    			} else {
    				group_outros();
    				transition_out(if_blocks[previous_block_index], 1, 1, () => {
    					if_blocks[previous_block_index] = null;
    				});
    				check_outros();

    				if_block = if_blocks[current_block_type_index];
    				if (!if_block) {
    					if_block = if_blocks[current_block_type_index] = if_block_creators[current_block_type_index](ctx);
    					if_block.c();
    				}
    				transition_in(if_block, 1);
    				if_block.m(a, null);
    			}

    			set_attributes(a, get_spread_update(a_levels, [
    				(changed.props) && ctx.props,
    				(changed.classes) && { class: ctx.classes },
    				(changed.href) && { href: ctx.href }
    			]));
    		},

    		i: function intro(local) {
    			if (current) return;
    			transition_in(if_block);
    			current = true;
    		},

    		o: function outro(local) {
    			transition_out(if_block);
    			current = false;
    		},

    		d: function destroy(detaching) {
    			if (detaching) {
    				detach_dev(a);
    			}

    			if_blocks[current_block_type_index].d();
    			dispose();
    		}
    	};
    	dispatch_dev("SvelteRegisterBlock", { block, id: create_fragment$c.name, type: "component", source: "", ctx });
    	return block;
    }

    function instance$c($$self, $$props, $$invalidate) {
    	

      let { class: className = '', next = false, previous = false, first = false, last = false, ariaLabel = '', href = '' } = $$props;

      const props = clean($$props);

      let defaultAriaLabel;

      let defaultCaret;

    	let { $$slots = {}, $$scope } = $$props;

    	function click_handler(event) {
    		bubble($$self, event);
    	}

    	$$self.$set = $$new_props => {
    		$$invalidate('$$props', $$props = assign(assign({}, $$props), $$new_props));
    		if ('class' in $$new_props) $$invalidate('className', className = $$new_props.class);
    		if ('next' in $$new_props) $$invalidate('next', next = $$new_props.next);
    		if ('previous' in $$new_props) $$invalidate('previous', previous = $$new_props.previous);
    		if ('first' in $$new_props) $$invalidate('first', first = $$new_props.first);
    		if ('last' in $$new_props) $$invalidate('last', last = $$new_props.last);
    		if ('ariaLabel' in $$new_props) $$invalidate('ariaLabel', ariaLabel = $$new_props.ariaLabel);
    		if ('href' in $$new_props) $$invalidate('href', href = $$new_props.href);
    		if ('$$scope' in $$new_props) $$invalidate('$$scope', $$scope = $$new_props.$$scope);
    	};

    	$$self.$capture_state = () => {
    		return { className, next, previous, first, last, ariaLabel, href, defaultAriaLabel, defaultCaret, classes, realLabel };
    	};

    	$$self.$inject_state = $$new_props => {
    		$$invalidate('$$props', $$props = assign(assign({}, $$props), $$new_props));
    		if ('className' in $$props) $$invalidate('className', className = $$new_props.className);
    		if ('next' in $$props) $$invalidate('next', next = $$new_props.next);
    		if ('previous' in $$props) $$invalidate('previous', previous = $$new_props.previous);
    		if ('first' in $$props) $$invalidate('first', first = $$new_props.first);
    		if ('last' in $$props) $$invalidate('last', last = $$new_props.last);
    		if ('ariaLabel' in $$props) $$invalidate('ariaLabel', ariaLabel = $$new_props.ariaLabel);
    		if ('href' in $$props) $$invalidate('href', href = $$new_props.href);
    		if ('defaultAriaLabel' in $$props) $$invalidate('defaultAriaLabel', defaultAriaLabel = $$new_props.defaultAriaLabel);
    		if ('defaultCaret' in $$props) $$invalidate('defaultCaret', defaultCaret = $$new_props.defaultCaret);
    		if ('classes' in $$props) $$invalidate('classes', classes = $$new_props.classes);
    		if ('realLabel' in $$props) $$invalidate('realLabel', realLabel = $$new_props.realLabel);
    	};

    	let classes, realLabel;

    	$$self.$$.update = ($$dirty = { className: 1, previous: 1, next: 1, first: 1, last: 1, ariaLabel: 1, defaultAriaLabel: 1 }) => {
    		if ($$dirty.className) { $$invalidate('classes', classes = clsx(
            className,
            'page-link',
          )); }
    		if ($$dirty.previous || $$dirty.next || $$dirty.first || $$dirty.last) { if(previous) {
            $$invalidate('defaultAriaLabel', defaultAriaLabel = 'Previous');
          } else if (next) {
            $$invalidate('defaultAriaLabel', defaultAriaLabel = 'Next');
          } else if (first) {
            $$invalidate('defaultAriaLabel', defaultAriaLabel = 'First');
          } else if (last) {
            $$invalidate('defaultAriaLabel', defaultAriaLabel = 'Last');
          } }
    		if ($$dirty.ariaLabel || $$dirty.defaultAriaLabel) { $$invalidate('realLabel', realLabel = ariaLabel || defaultAriaLabel); }
    		if ($$dirty.previous || $$dirty.next || $$dirty.first || $$dirty.last) { if (previous) {
            $$invalidate('defaultCaret', defaultCaret = '\u2039');
          } else if (next) {
            $$invalidate('defaultCaret', defaultCaret = '\u203A');
          } else if (first) {
            $$invalidate('defaultCaret', defaultCaret = '\u00ab');
          } else if (last) {
            $$invalidate('defaultCaret', defaultCaret = '\u00bb');
          } }
    	};

    	return {
    		className,
    		next,
    		previous,
    		first,
    		last,
    		ariaLabel,
    		href,
    		props,
    		defaultCaret,
    		classes,
    		realLabel,
    		click_handler,
    		$$props: $$props = exclude_internal_props($$props),
    		$$slots,
    		$$scope
    	};
    }

    class PaginationLink extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$c, create_fragment$c, safe_not_equal, ["class", "next", "previous", "first", "last", "ariaLabel", "href"]);
    		dispatch_dev("SvelteRegisterComponent", { component: this, tagName: "PaginationLink", options, id: create_fragment$c.name });
    	}

    	get class() {
    		throw new Error("<PaginationLink>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set class(value) {
    		throw new Error("<PaginationLink>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get next() {
    		throw new Error("<PaginationLink>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set next(value) {
    		throw new Error("<PaginationLink>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get previous() {
    		throw new Error("<PaginationLink>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set previous(value) {
    		throw new Error("<PaginationLink>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get first() {
    		throw new Error("<PaginationLink>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set first(value) {
    		throw new Error("<PaginationLink>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get last() {
    		throw new Error("<PaginationLink>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set last(value) {
    		throw new Error("<PaginationLink>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get ariaLabel() {
    		throw new Error("<PaginationLink>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set ariaLabel(value) {
    		throw new Error("<PaginationLink>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get href() {
    		throw new Error("<PaginationLink>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set href(value) {
    		throw new Error("<PaginationLink>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* node_modules\sveltestrap\src\Table.svelte generated by Svelte v3.12.1 */

    const file$b = "node_modules\\sveltestrap\\src\\Table.svelte";

    // (38:0) {:else}
    function create_else_block$3(ctx) {
    	var table, current;

    	const default_slot_template = ctx.$$slots.default;
    	const default_slot = create_slot(default_slot_template, ctx, null);

    	var table_levels = [
    		ctx.props,
    		{ class: ctx.classes }
    	];

    	var table_data = {};
    	for (var i = 0; i < table_levels.length; i += 1) {
    		table_data = assign(table_data, table_levels[i]);
    	}

    	const block = {
    		c: function create() {
    			table = element("table");

    			if (default_slot) default_slot.c();

    			set_attributes(table, table_data);
    			add_location(table, file$b, 38, 2, 949);
    		},

    		l: function claim(nodes) {
    			if (default_slot) default_slot.l(table_nodes);
    		},

    		m: function mount(target, anchor) {
    			insert_dev(target, table, anchor);

    			if (default_slot) {
    				default_slot.m(table, null);
    			}

    			current = true;
    		},

    		p: function update(changed, ctx) {
    			if (default_slot && default_slot.p && changed.$$scope) {
    				default_slot.p(
    					get_slot_changes(default_slot_template, ctx, changed, null),
    					get_slot_context(default_slot_template, ctx, null)
    				);
    			}

    			set_attributes(table, get_spread_update(table_levels, [
    				(changed.props) && ctx.props,
    				(changed.classes) && { class: ctx.classes }
    			]));
    		},

    		i: function intro(local) {
    			if (current) return;
    			transition_in(default_slot, local);
    			current = true;
    		},

    		o: function outro(local) {
    			transition_out(default_slot, local);
    			current = false;
    		},

    		d: function destroy(detaching) {
    			if (detaching) {
    				detach_dev(table);
    			}

    			if (default_slot) default_slot.d(detaching);
    		}
    	};
    	dispatch_dev("SvelteRegisterBlock", { block, id: create_else_block$3.name, type: "else", source: "(38:0) {:else}", ctx });
    	return block;
    }

    // (32:0) {#if responsive}
    function create_if_block$4(ctx) {
    	var div, table, current;

    	const default_slot_template = ctx.$$slots.default;
    	const default_slot = create_slot(default_slot_template, ctx, null);

    	var table_levels = [
    		ctx.props,
    		{ class: ctx.classes }
    	];

    	var table_data = {};
    	for (var i = 0; i < table_levels.length; i += 1) {
    		table_data = assign(table_data, table_levels[i]);
    	}

    	const block = {
    		c: function create() {
    			div = element("div");
    			table = element("table");

    			if (default_slot) default_slot.c();

    			set_attributes(table, table_data);
    			add_location(table, file$b, 33, 4, 865);
    			attr_dev(div, "class", ctx.responsiveClassName);
    			add_location(div, file$b, 32, 2, 825);
    		},

    		l: function claim(nodes) {
    			if (default_slot) default_slot.l(table_nodes);
    		},

    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    			append_dev(div, table);

    			if (default_slot) {
    				default_slot.m(table, null);
    			}

    			current = true;
    		},

    		p: function update(changed, ctx) {
    			if (default_slot && default_slot.p && changed.$$scope) {
    				default_slot.p(
    					get_slot_changes(default_slot_template, ctx, changed, null),
    					get_slot_context(default_slot_template, ctx, null)
    				);
    			}

    			set_attributes(table, get_spread_update(table_levels, [
    				(changed.props) && ctx.props,
    				(changed.classes) && { class: ctx.classes }
    			]));

    			if (!current || changed.responsiveClassName) {
    				attr_dev(div, "class", ctx.responsiveClassName);
    			}
    		},

    		i: function intro(local) {
    			if (current) return;
    			transition_in(default_slot, local);
    			current = true;
    		},

    		o: function outro(local) {
    			transition_out(default_slot, local);
    			current = false;
    		},

    		d: function destroy(detaching) {
    			if (detaching) {
    				detach_dev(div);
    			}

    			if (default_slot) default_slot.d(detaching);
    		}
    	};
    	dispatch_dev("SvelteRegisterBlock", { block, id: create_if_block$4.name, type: "if", source: "(32:0) {#if responsive}", ctx });
    	return block;
    }

    function create_fragment$d(ctx) {
    	var current_block_type_index, if_block, if_block_anchor, current;

    	var if_block_creators = [
    		create_if_block$4,
    		create_else_block$3
    	];

    	var if_blocks = [];

    	function select_block_type(changed, ctx) {
    		if (ctx.responsive) return 0;
    		return 1;
    	}

    	current_block_type_index = select_block_type(null, ctx);
    	if_block = if_blocks[current_block_type_index] = if_block_creators[current_block_type_index](ctx);

    	const block = {
    		c: function create() {
    			if_block.c();
    			if_block_anchor = empty();
    		},

    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},

    		m: function mount(target, anchor) {
    			if_blocks[current_block_type_index].m(target, anchor);
    			insert_dev(target, if_block_anchor, anchor);
    			current = true;
    		},

    		p: function update(changed, ctx) {
    			var previous_block_index = current_block_type_index;
    			current_block_type_index = select_block_type(changed, ctx);
    			if (current_block_type_index === previous_block_index) {
    				if_blocks[current_block_type_index].p(changed, ctx);
    			} else {
    				group_outros();
    				transition_out(if_blocks[previous_block_index], 1, 1, () => {
    					if_blocks[previous_block_index] = null;
    				});
    				check_outros();

    				if_block = if_blocks[current_block_type_index];
    				if (!if_block) {
    					if_block = if_blocks[current_block_type_index] = if_block_creators[current_block_type_index](ctx);
    					if_block.c();
    				}
    				transition_in(if_block, 1);
    				if_block.m(if_block_anchor.parentNode, if_block_anchor);
    			}
    		},

    		i: function intro(local) {
    			if (current) return;
    			transition_in(if_block);
    			current = true;
    		},

    		o: function outro(local) {
    			transition_out(if_block);
    			current = false;
    		},

    		d: function destroy(detaching) {
    			if_blocks[current_block_type_index].d(detaching);

    			if (detaching) {
    				detach_dev(if_block_anchor);
    			}
    		}
    	};
    	dispatch_dev("SvelteRegisterBlock", { block, id: create_fragment$d.name, type: "component", source: "", ctx });
    	return block;
    }

    function instance$d($$self, $$props, $$invalidate) {
    	

      let { class: className = '', size = '', bordered = false, borderless = false, striped = false, dark = false, hover = false, responsive = false } = $$props;

      const props = clean($$props);

    	let { $$slots = {}, $$scope } = $$props;

    	$$self.$set = $$new_props => {
    		$$invalidate('$$props', $$props = assign(assign({}, $$props), $$new_props));
    		if ('class' in $$new_props) $$invalidate('className', className = $$new_props.class);
    		if ('size' in $$new_props) $$invalidate('size', size = $$new_props.size);
    		if ('bordered' in $$new_props) $$invalidate('bordered', bordered = $$new_props.bordered);
    		if ('borderless' in $$new_props) $$invalidate('borderless', borderless = $$new_props.borderless);
    		if ('striped' in $$new_props) $$invalidate('striped', striped = $$new_props.striped);
    		if ('dark' in $$new_props) $$invalidate('dark', dark = $$new_props.dark);
    		if ('hover' in $$new_props) $$invalidate('hover', hover = $$new_props.hover);
    		if ('responsive' in $$new_props) $$invalidate('responsive', responsive = $$new_props.responsive);
    		if ('$$scope' in $$new_props) $$invalidate('$$scope', $$scope = $$new_props.$$scope);
    	};

    	$$self.$capture_state = () => {
    		return { className, size, bordered, borderless, striped, dark, hover, responsive, classes, responsiveClassName };
    	};

    	$$self.$inject_state = $$new_props => {
    		$$invalidate('$$props', $$props = assign(assign({}, $$props), $$new_props));
    		if ('className' in $$props) $$invalidate('className', className = $$new_props.className);
    		if ('size' in $$props) $$invalidate('size', size = $$new_props.size);
    		if ('bordered' in $$props) $$invalidate('bordered', bordered = $$new_props.bordered);
    		if ('borderless' in $$props) $$invalidate('borderless', borderless = $$new_props.borderless);
    		if ('striped' in $$props) $$invalidate('striped', striped = $$new_props.striped);
    		if ('dark' in $$props) $$invalidate('dark', dark = $$new_props.dark);
    		if ('hover' in $$props) $$invalidate('hover', hover = $$new_props.hover);
    		if ('responsive' in $$props) $$invalidate('responsive', responsive = $$new_props.responsive);
    		if ('classes' in $$props) $$invalidate('classes', classes = $$new_props.classes);
    		if ('responsiveClassName' in $$props) $$invalidate('responsiveClassName', responsiveClassName = $$new_props.responsiveClassName);
    	};

    	let classes, responsiveClassName;

    	$$self.$$.update = ($$dirty = { className: 1, size: 1, bordered: 1, borderless: 1, striped: 1, dark: 1, hover: 1, responsive: 1 }) => {
    		if ($$dirty.className || $$dirty.size || $$dirty.bordered || $$dirty.borderless || $$dirty.striped || $$dirty.dark || $$dirty.hover) { $$invalidate('classes', classes = clsx(
            className,
            'table',
            size ? 'table-' + size : false,
            bordered ? 'table-bordered' : false,
            borderless ? 'table-borderless' : false,
            striped ? 'table-striped' : false,
            dark ? 'table-dark' : false,
            hover ? 'table-hover' : false,
          )); }
    		if ($$dirty.responsive) { $$invalidate('responsiveClassName', responsiveClassName = responsive === true ? 'table-responsive' : `table-responsive-${responsive}`); }
    	};

    	return {
    		className,
    		size,
    		bordered,
    		borderless,
    		striped,
    		dark,
    		hover,
    		responsive,
    		props,
    		classes,
    		responsiveClassName,
    		$$props: $$props = exclude_internal_props($$props),
    		$$slots,
    		$$scope
    	};
    }

    class Table extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$d, create_fragment$d, safe_not_equal, ["class", "size", "bordered", "borderless", "striped", "dark", "hover", "responsive"]);
    		dispatch_dev("SvelteRegisterComponent", { component: this, tagName: "Table", options, id: create_fragment$d.name });
    	}

    	get class() {
    		throw new Error("<Table>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set class(value) {
    		throw new Error("<Table>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get size() {
    		throw new Error("<Table>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set size(value) {
    		throw new Error("<Table>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get bordered() {
    		throw new Error("<Table>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set bordered(value) {
    		throw new Error("<Table>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get borderless() {
    		throw new Error("<Table>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set borderless(value) {
    		throw new Error("<Table>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get striped() {
    		throw new Error("<Table>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set striped(value) {
    		throw new Error("<Table>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get dark() {
    		throw new Error("<Table>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set dark(value) {
    		throw new Error("<Table>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get hover() {
    		throw new Error("<Table>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set hover(value) {
    		throw new Error("<Table>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get responsive() {
    		throw new Error("<Table>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set responsive(value) {
    		throw new Error("<Table>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* src\router\_App\Nav.svelte generated by Svelte v3.12.1 */

    const file$c = "src\\router\\_App\\Nav.svelte";

    // (36:1) <NavbarBrand href="./">
    function create_default_slot_7(ctx) {
    	var i, t0, t1_value = app.title + "", t1;

    	const block = {
    		c: function create() {
    			i = element("i");
    			t0 = space();
    			t1 = text(t1_value);
    			attr_dev(i, "class", "fa fa-certificate");
    			add_location(i, file$c, 36, 2, 570);
    		},

    		m: function mount(target, anchor) {
    			insert_dev(target, i, anchor);
    			insert_dev(target, t0, anchor);
    			insert_dev(target, t1, anchor);
    		},

    		p: noop,

    		d: function destroy(detaching) {
    			if (detaching) {
    				detach_dev(i);
    				detach_dev(t0);
    				detach_dev(t1);
    			}
    		}
    	};
    	dispatch_dev("SvelteRegisterBlock", { block, id: create_default_slot_7.name, type: "slot", source: "(36:1) <NavbarBrand href=\"./\">", ctx });
    	return block;
    }

    // (45:3) <NavLink href="./">
    function create_default_slot_6(ctx) {
    	var t;

    	const block = {
    		c: function create() {
    			t = text("首页");
    		},

    		m: function mount(target, anchor) {
    			insert_dev(target, t, anchor);
    		},

    		d: function destroy(detaching) {
    			if (detaching) {
    				detach_dev(t);
    			}
    		}
    	};
    	dispatch_dev("SvelteRegisterBlock", { block, id: create_default_slot_6.name, type: "slot", source: "(45:3) <NavLink href=\"./\">", ctx });
    	return block;
    }

    // (44:2) <NavItem>
    function create_default_slot_5(ctx) {
    	var current;

    	var navlink = new NavLink({
    		props: {
    		href: "./",
    		$$slots: { default: [create_default_slot_6] },
    		$$scope: { ctx }
    	},
    		$$inline: true
    	});

    	const block = {
    		c: function create() {
    			navlink.$$.fragment.c();
    		},

    		m: function mount(target, anchor) {
    			mount_component(navlink, target, anchor);
    			current = true;
    		},

    		p: function update(changed, ctx) {
    			var navlink_changes = {};
    			if (changed.$$scope) navlink_changes.$$scope = { changed, ctx };
    			navlink.$set(navlink_changes);
    		},

    		i: function intro(local) {
    			if (current) return;
    			transition_in(navlink.$$.fragment, local);

    			current = true;
    		},

    		o: function outro(local) {
    			transition_out(navlink.$$.fragment, local);
    			current = false;
    		},

    		d: function destroy(detaching) {
    			destroy_component(navlink, detaching);
    		}
    	};
    	dispatch_dev("SvelteRegisterBlock", { block, id: create_default_slot_5.name, type: "slot", source: "(44:2) <NavItem>", ctx });
    	return block;
    }

    // (48:3) <NavLink href="javascript:;" on:click={changePageValues}>
    function create_default_slot_4(ctx) {
    	var t;

    	const block = {
    		c: function create() {
    			t = text("文档");
    		},

    		m: function mount(target, anchor) {
    			insert_dev(target, t, anchor);
    		},

    		d: function destroy(detaching) {
    			if (detaching) {
    				detach_dev(t);
    			}
    		}
    	};
    	dispatch_dev("SvelteRegisterBlock", { block, id: create_default_slot_4.name, type: "slot", source: "(48:3) <NavLink href=\"javascript:;\" on:click={changePageValues}>", ctx });
    	return block;
    }

    // (47:2) <NavItem>
    function create_default_slot_3(ctx) {
    	var current;

    	var navlink = new NavLink({
    		props: {
    		href: "javascript:;",
    		$$slots: { default: [create_default_slot_4] },
    		$$scope: { ctx }
    	},
    		$$inline: true
    	});
    	navlink.$on("click", changePageValues);

    	const block = {
    		c: function create() {
    			navlink.$$.fragment.c();
    		},

    		m: function mount(target, anchor) {
    			mount_component(navlink, target, anchor);
    			current = true;
    		},

    		p: function update(changed, ctx) {
    			var navlink_changes = {};
    			if (changed.$$scope) navlink_changes.$$scope = { changed, ctx };
    			navlink.$set(navlink_changes);
    		},

    		i: function intro(local) {
    			if (current) return;
    			transition_in(navlink.$$.fragment, local);

    			current = true;
    		},

    		o: function outro(local) {
    			transition_out(navlink.$$.fragment, local);
    			current = false;
    		},

    		d: function destroy(detaching) {
    			destroy_component(navlink, detaching);
    		}
    	};
    	dispatch_dev("SvelteRegisterBlock", { block, id: create_default_slot_3.name, type: "slot", source: "(47:2) <NavItem>", ctx });
    	return block;
    }

    // (43:1) <Nav class="ml-auto" navbar>
    function create_default_slot_2(ctx) {
    	var t, current;

    	var navitem0 = new NavItem({
    		props: {
    		$$slots: { default: [create_default_slot_5] },
    		$$scope: { ctx }
    	},
    		$$inline: true
    	});

    	var navitem1 = new NavItem({
    		props: {
    		$$slots: { default: [create_default_slot_3] },
    		$$scope: { ctx }
    	},
    		$$inline: true
    	});

    	const block = {
    		c: function create() {
    			navitem0.$$.fragment.c();
    			t = space();
    			navitem1.$$.fragment.c();
    		},

    		m: function mount(target, anchor) {
    			mount_component(navitem0, target, anchor);
    			insert_dev(target, t, anchor);
    			mount_component(navitem1, target, anchor);
    			current = true;
    		},

    		p: function update(changed, ctx) {
    			var navitem0_changes = {};
    			if (changed.$$scope) navitem0_changes.$$scope = { changed, ctx };
    			navitem0.$set(navitem0_changes);

    			var navitem1_changes = {};
    			if (changed.$$scope) navitem1_changes.$$scope = { changed, ctx };
    			navitem1.$set(navitem1_changes);
    		},

    		i: function intro(local) {
    			if (current) return;
    			transition_in(navitem0.$$.fragment, local);

    			transition_in(navitem1.$$.fragment, local);

    			current = true;
    		},

    		o: function outro(local) {
    			transition_out(navitem0.$$.fragment, local);
    			transition_out(navitem1.$$.fragment, local);
    			current = false;
    		},

    		d: function destroy(detaching) {
    			destroy_component(navitem0, detaching);

    			if (detaching) {
    				detach_dev(t);
    			}

    			destroy_component(navitem1, detaching);
    		}
    	};
    	dispatch_dev("SvelteRegisterBlock", { block, id: create_default_slot_2.name, type: "slot", source: "(43:1) <Nav class=\"ml-auto\" navbar>", ctx });
    	return block;
    }

    // (42:1) <Collapse {isOpen} navbar expand="md" on:update={handleUpdate}>
    function create_default_slot_1(ctx) {
    	var current;

    	var nav = new Nav({
    		props: {
    		class: "ml-auto",
    		navbar: true,
    		$$slots: { default: [create_default_slot_2] },
    		$$scope: { ctx }
    	},
    		$$inline: true
    	});

    	const block = {
    		c: function create() {
    			nav.$$.fragment.c();
    		},

    		m: function mount(target, anchor) {
    			mount_component(nav, target, anchor);
    			current = true;
    		},

    		p: function update(changed, ctx) {
    			var nav_changes = {};
    			if (changed.$$scope) nav_changes.$$scope = { changed, ctx };
    			nav.$set(nav_changes);
    		},

    		i: function intro(local) {
    			if (current) return;
    			transition_in(nav.$$.fragment, local);

    			current = true;
    		},

    		o: function outro(local) {
    			transition_out(nav.$$.fragment, local);
    			current = false;
    		},

    		d: function destroy(detaching) {
    			destroy_component(nav, detaching);
    		}
    	};
    	dispatch_dev("SvelteRegisterBlock", { block, id: create_default_slot_1.name, type: "slot", source: "(42:1) <Collapse {isOpen} navbar expand=\"md\" on:update={handleUpdate}>", ctx });
    	return block;
    }

    // (35:0) <Navbar color="light" light expand="md">
    function create_default_slot$1(ctx) {
    	var t0, t1, current;

    	var navbarbrand = new NavbarBrand({
    		props: {
    		href: "./",
    		$$slots: { default: [create_default_slot_7] },
    		$$scope: { ctx }
    	},
    		$$inline: true
    	});

    	var navbartoggler = new NavbarToggler({ $$inline: true });
    	navbartoggler.$on("click", ctx.click_handler);

    	var collapse = new Collapse({
    		props: {
    		isOpen: ctx.isOpen,
    		navbar: true,
    		expand: "md",
    		$$slots: { default: [create_default_slot_1] },
    		$$scope: { ctx }
    	},
    		$$inline: true
    	});
    	collapse.$on("update", ctx.handleUpdate);

    	const block = {
    		c: function create() {
    			navbarbrand.$$.fragment.c();
    			t0 = space();
    			navbartoggler.$$.fragment.c();
    			t1 = space();
    			collapse.$$.fragment.c();
    		},

    		m: function mount(target, anchor) {
    			mount_component(navbarbrand, target, anchor);
    			insert_dev(target, t0, anchor);
    			mount_component(navbartoggler, target, anchor);
    			insert_dev(target, t1, anchor);
    			mount_component(collapse, target, anchor);
    			current = true;
    		},

    		p: function update(changed, ctx) {
    			var navbarbrand_changes = {};
    			if (changed.$$scope) navbarbrand_changes.$$scope = { changed, ctx };
    			navbarbrand.$set(navbarbrand_changes);

    			var collapse_changes = {};
    			if (changed.isOpen) collapse_changes.isOpen = ctx.isOpen;
    			if (changed.$$scope) collapse_changes.$$scope = { changed, ctx };
    			collapse.$set(collapse_changes);
    		},

    		i: function intro(local) {
    			if (current) return;
    			transition_in(navbarbrand.$$.fragment, local);

    			transition_in(navbartoggler.$$.fragment, local);

    			transition_in(collapse.$$.fragment, local);

    			current = true;
    		},

    		o: function outro(local) {
    			transition_out(navbarbrand.$$.fragment, local);
    			transition_out(navbartoggler.$$.fragment, local);
    			transition_out(collapse.$$.fragment, local);
    			current = false;
    		},

    		d: function destroy(detaching) {
    			destroy_component(navbarbrand, detaching);

    			if (detaching) {
    				detach_dev(t0);
    			}

    			destroy_component(navbartoggler, detaching);

    			if (detaching) {
    				detach_dev(t1);
    			}

    			destroy_component(collapse, detaching);
    		}
    	};
    	dispatch_dev("SvelteRegisterBlock", { block, id: create_default_slot$1.name, type: "slot", source: "(35:0) <Navbar color=\"light\" light expand=\"md\">", ctx });
    	return block;
    }

    function create_fragment$e(ctx) {
    	var current;

    	var navbar = new Navbar({
    		props: {
    		color: "light",
    		light: true,
    		expand: "md",
    		$$slots: { default: [create_default_slot$1] },
    		$$scope: { ctx }
    	},
    		$$inline: true
    	});

    	const block = {
    		c: function create() {
    			navbar.$$.fragment.c();
    		},

    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},

    		m: function mount(target, anchor) {
    			mount_component(navbar, target, anchor);
    			current = true;
    		},

    		p: function update(changed, ctx) {
    			var navbar_changes = {};
    			if (changed.$$scope || changed.isOpen) navbar_changes.$$scope = { changed, ctx };
    			navbar.$set(navbar_changes);
    		},

    		i: function intro(local) {
    			if (current) return;
    			transition_in(navbar.$$.fragment, local);

    			current = true;
    		},

    		o: function outro(local) {
    			transition_out(navbar.$$.fragment, local);
    			current = false;
    		},

    		d: function destroy(detaching) {
    			destroy_component(navbar, detaching);
    		}
    	};
    	dispatch_dev("SvelteRegisterBlock", { block, id: create_fragment$e.name, type: "component", source: "", ctx });
    	return block;
    }

    function changePageValues() {
    	changePage.update( v => !v );
    }

    function instance$e($$self, $$props, $$invalidate) {
    	

    	let isOpen = false;

    	function handleUpdate(event) {
    		$$invalidate('isOpen', isOpen = event.detail.isOpen);
    	}

    	const click_handler = () => ($$invalidate('isOpen', isOpen = !isOpen));

    	$$self.$capture_state = () => {
    		return {};
    	};

    	$$self.$inject_state = $$props => {
    		if ('isOpen' in $$props) $$invalidate('isOpen', isOpen = $$props.isOpen);
    	};

    	return { isOpen, handleUpdate, click_handler };
    }

    class Nav_1 extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$e, create_fragment$e, safe_not_equal, []);
    		dispatch_dev("SvelteRegisterComponent", { component: this, tagName: "Nav_1", options, id: create_fragment$e.name });
    	}
    }

    /* src\router\_App\Footer.svelte generated by Svelte v3.12.1 */

    const file$d = "src\\router\\_App\\Footer.svelte";

    function create_fragment$f(ctx) {
    	var br0, t0, p, t2, br1;

    	const block = {
    		c: function create() {
    			br0 = element("br");
    			t0 = space();
    			p = element("p");
    			p.textContent = "档案馆 © 2019";
    			t2 = space();
    			br1 = element("br");
    			add_location(br0, file$d, 0, 0, 0);
    			set_style(p, "color", "grey");
    			set_style(p, "text-align", "center");
    			add_location(p, file$d, 1, 0, 7);
    			add_location(br1, file$d, 4, 0, 71);
    		},

    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},

    		m: function mount(target, anchor) {
    			insert_dev(target, br0, anchor);
    			insert_dev(target, t0, anchor);
    			insert_dev(target, p, anchor);
    			insert_dev(target, t2, anchor);
    			insert_dev(target, br1, anchor);
    		},

    		p: noop,
    		i: noop,
    		o: noop,

    		d: function destroy(detaching) {
    			if (detaching) {
    				detach_dev(br0);
    				detach_dev(t0);
    				detach_dev(p);
    				detach_dev(t2);
    				detach_dev(br1);
    			}
    		}
    	};
    	dispatch_dev("SvelteRegisterBlock", { block, id: create_fragment$f.name, type: "component", source: "", ctx });
    	return block;
    }

    class Footer extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, null, create_fragment$f, safe_not_equal, []);
    		dispatch_dev("SvelteRegisterComponent", { component: this, tagName: "Footer", options, id: create_fragment$f.name });
    	}
    }

    /* src\router\Home\Jumbotron.svelte generated by Svelte v3.12.1 */

    const file$e = "src\\router\\Home\\Jumbotron.svelte";

    function create_fragment$g(ctx) {
    	var div, h1, t1, p, t2, a, t4, t5, hr, t6, br;

    	const block = {
    		c: function create() {
    			div = element("div");
    			h1 = element("h1");
    			h1.textContent = "文档列表";
    			t1 = space();
    			p = element("p");
    			t2 = text("展示 ");
    			a = element("a");
    			a.textContent = "档案馆";
    			t4 = text(" 里所有的文档");
    			t5 = space();
    			hr = element("hr");
    			t6 = space();
    			br = element("br");
    			attr_dev(h1, "class", "display-4");
    			add_location(h1, file$e, 23, 4, 359);
    			attr_dev(a, "href", "./");
    			set_style(a, "color", "orange");
    			add_location(a, file$e, 25, 11, 425);
    			attr_dev(p, "class", "lead");
    			add_location(p, file$e, 24, 4, 396);
    			attr_dev(hr, "class", "my-4");
    			add_location(hr, file$e, 27, 4, 490);
    			add_location(br, file$e, 28, 4, 513);
    			attr_dev(div, "class", "jumbotron _main_jumbo svelte-mu4eue");
    			add_location(div, file$e, 22, 0, 318);
    		},

    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},

    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    			append_dev(div, h1);
    			append_dev(div, t1);
    			append_dev(div, p);
    			append_dev(p, t2);
    			append_dev(p, a);
    			append_dev(p, t4);
    			append_dev(div, t5);
    			append_dev(div, hr);
    			append_dev(div, t6);
    			append_dev(div, br);
    		},

    		p: noop,
    		i: noop,
    		o: noop,

    		d: function destroy(detaching) {
    			if (detaching) {
    				detach_dev(div);
    			}
    		}
    	};
    	dispatch_dev("SvelteRegisterBlock", { block, id: create_fragment$g.name, type: "component", source: "", ctx });
    	return block;
    }

    class Jumbotron extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, null, create_fragment$g, safe_not_equal, []);
    		dispatch_dev("SvelteRegisterComponent", { component: this, tagName: "Jumbotron", options, id: create_fragment$g.name });
    	}
    }

    /* src\router\Home\List.svelte generated by Svelte v3.12.1 */
    const { console: console_1 } = globals;

    const file_1 = "src\\router\\Home\\List.svelte";

    function get_each_context(ctx, list, i) {
    	const child_ctx = Object.create(ctx);
    	child_ctx.item = list[i];
    	return child_ctx;
    }

    function get_each_context_1(ctx, list, i) {
    	const child_ctx = Object.create(ctx);
    	child_ctx.item = list[i];
    	child_ctx.id = i;
    	return child_ctx;
    }

    // (92:2) {#if (page*size <= id) && (id <= (page+1)*size-1)}
    function create_if_block_3$1(ctx) {
    	var tr, td, t0_value = ctx.item.DATA1 + "", t0, t1, dispose;

    	function click_handler() {
    		return ctx.click_handler(ctx);
    	}

    	const block = {
    		c: function create() {
    			tr = element("tr");
    			td = element("td");
    			t0 = text(t0_value);
    			t1 = space();
    			add_location(td, file_1, 93, 3, 1881);
    			add_location(tr, file_1, 92, 2, 1872);
    			dispose = listen_dev(td, "click", click_handler);
    		},

    		m: function mount(target, anchor) {
    			insert_dev(target, tr, anchor);
    			append_dev(tr, td);
    			append_dev(td, t0);
    			append_dev(tr, t1);
    		},

    		p: function update(changed, new_ctx) {
    			ctx = new_ctx;
    			if ((changed.getSearch) && t0_value !== (t0_value = ctx.item.DATA1 + "")) {
    				set_data_dev(t0, t0_value);
    			}
    		},

    		d: function destroy(detaching) {
    			if (detaching) {
    				detach_dev(tr);
    			}

    			dispose();
    		}
    	};
    	dispatch_dev("SvelteRegisterBlock", { block, id: create_if_block_3$1.name, type: "if", source: "(92:2) {#if (page*size <= id) && (id <= (page+1)*size-1)}", ctx });
    	return block;
    }

    // (91:2) {#each getSearch as item, id}
    function create_each_block_1(ctx) {
    	var if_block_anchor;

    	var if_block = ((ctx.page*ctx.size <= ctx.id) && (ctx.id <= (ctx.page+1)*ctx.size-1)) && create_if_block_3$1(ctx);

    	const block = {
    		c: function create() {
    			if (if_block) if_block.c();
    			if_block_anchor = empty();
    		},

    		m: function mount(target, anchor) {
    			if (if_block) if_block.m(target, anchor);
    			insert_dev(target, if_block_anchor, anchor);
    		},

    		p: function update(changed, ctx) {
    			if ((ctx.page*ctx.size <= ctx.id) && (ctx.id <= (ctx.page+1)*ctx.size-1)) {
    				if (if_block) {
    					if_block.p(changed, ctx);
    				} else {
    					if_block = create_if_block_3$1(ctx);
    					if_block.c();
    					if_block.m(if_block_anchor.parentNode, if_block_anchor);
    				}
    			} else if (if_block) {
    				if_block.d(1);
    				if_block = null;
    			}
    		},

    		d: function destroy(detaching) {
    			if (if_block) if_block.d(detaching);

    			if (detaching) {
    				detach_dev(if_block_anchor);
    			}
    		}
    	};
    	dispatch_dev("SvelteRegisterBlock", { block, id: create_each_block_1.name, type: "each", source: "(91:2) {#each getSearch as item, id}", ctx });
    	return block;
    }

    // (86:0) <Table>
    function create_default_slot_7$1(ctx) {
    	var tbody, tr, td, t0, t1_value = ctx.getSearch.length + "", t1, t2, t3;

    	let each_value_1 = ctx.getSearch;

    	let each_blocks = [];

    	for (let i = 0; i < each_value_1.length; i += 1) {
    		each_blocks[i] = create_each_block_1(get_each_context_1(ctx, each_value_1, i));
    	}

    	const block = {
    		c: function create() {
    			tbody = element("tbody");
    			tr = element("tr");
    			td = element("td");
    			t0 = text("返回");
    			t1 = text(t1_value);
    			t2 = text("个结果");
    			t3 = space();

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}
    			set_style(td, "text-align", "center");
    			add_location(td, file_1, 88, 3, 1712);
    			add_location(tr, file_1, 87, 2, 1703);
    			add_location(tbody, file_1, 86, 1, 1692);
    		},

    		m: function mount(target, anchor) {
    			insert_dev(target, tbody, anchor);
    			append_dev(tbody, tr);
    			append_dev(tr, td);
    			append_dev(td, t0);
    			append_dev(td, t1);
    			append_dev(td, t2);
    			append_dev(tbody, t3);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].m(tbody, null);
    			}
    		},

    		p: function update(changed, ctx) {
    			if ((changed.getSearch) && t1_value !== (t1_value = ctx.getSearch.length + "")) {
    				set_data_dev(t1, t1_value);
    			}

    			if (changed.page || changed.size || changed.getSearch) {
    				each_value_1 = ctx.getSearch;

    				let i;
    				for (i = 0; i < each_value_1.length; i += 1) {
    					const child_ctx = get_each_context_1(ctx, each_value_1, i);

    					if (each_blocks[i]) {
    						each_blocks[i].p(changed, child_ctx);
    					} else {
    						each_blocks[i] = create_each_block_1(child_ctx);
    						each_blocks[i].c();
    						each_blocks[i].m(tbody, null);
    					}
    				}

    				for (; i < each_blocks.length; i += 1) {
    					each_blocks[i].d(1);
    				}
    				each_blocks.length = each_value_1.length;
    			}
    		},

    		d: function destroy(detaching) {
    			if (detaching) {
    				detach_dev(tbody);
    			}

    			destroy_each(each_blocks, detaching);
    		}
    	};
    	dispatch_dev("SvelteRegisterBlock", { block, id: create_default_slot_7$1.name, type: "slot", source: "(86:0) <Table>", ctx });
    	return block;
    }

    // (107:1) <PaginationItem>
    function create_default_slot_6$1(ctx) {
    	var current;

    	var paginationlink = new PaginationLink({
    		props: { first: true, href: "javacript:;" },
    		$$inline: true
    	});
    	paginationlink.$on("click", ctx.click_handler_1);

    	const block = {
    		c: function create() {
    			paginationlink.$$.fragment.c();
    		},

    		m: function mount(target, anchor) {
    			mount_component(paginationlink, target, anchor);
    			current = true;
    		},

    		p: noop,

    		i: function intro(local) {
    			if (current) return;
    			transition_in(paginationlink.$$.fragment, local);

    			current = true;
    		},

    		o: function outro(local) {
    			transition_out(paginationlink.$$.fragment, local);
    			current = false;
    		},

    		d: function destroy(detaching) {
    			destroy_component(paginationlink, detaching);
    		}
    	};
    	dispatch_dev("SvelteRegisterBlock", { block, id: create_default_slot_6$1.name, type: "slot", source: "(107:1) <PaginationItem>", ctx });
    	return block;
    }

    // (111:1) {#if page !== 0}
    function create_if_block_2$1(ctx) {
    	var current;

    	var paginationitem = new PaginationItem({
    		props: {
    		disabled: true,
    		$$slots: { default: [create_default_slot_5$1] },
    		$$scope: { ctx }
    	},
    		$$inline: true
    	});

    	const block = {
    		c: function create() {
    			paginationitem.$$.fragment.c();
    		},

    		m: function mount(target, anchor) {
    			mount_component(paginationitem, target, anchor);
    			current = true;
    		},

    		i: function intro(local) {
    			if (current) return;
    			transition_in(paginationitem.$$.fragment, local);

    			current = true;
    		},

    		o: function outro(local) {
    			transition_out(paginationitem.$$.fragment, local);
    			current = false;
    		},

    		d: function destroy(detaching) {
    			destroy_component(paginationitem, detaching);
    		}
    	};
    	dispatch_dev("SvelteRegisterBlock", { block, id: create_if_block_2$1.name, type: "if", source: "(111:1) {#if page !== 0}", ctx });
    	return block;
    }

    // (112:4) <PaginationItem disabled>
    function create_default_slot_5$1(ctx) {
    	var current;

    	var paginationlink = new PaginationLink({
    		props: { previous: true, href: "javacript:;" },
    		$$inline: true
    	});
    	paginationlink.$on("click", ctx.click_handler_2);

    	const block = {
    		c: function create() {
    			paginationlink.$$.fragment.c();
    		},

    		m: function mount(target, anchor) {
    			mount_component(paginationlink, target, anchor);
    			current = true;
    		},

    		p: noop,

    		i: function intro(local) {
    			if (current) return;
    			transition_in(paginationlink.$$.fragment, local);

    			current = true;
    		},

    		o: function outro(local) {
    			transition_out(paginationlink.$$.fragment, local);
    			current = false;
    		},

    		d: function destroy(detaching) {
    			destroy_component(paginationlink, detaching);
    		}
    	};
    	dispatch_dev("SvelteRegisterBlock", { block, id: create_default_slot_5$1.name, type: "slot", source: "(112:4) <PaginationItem disabled>", ctx });
    	return block;
    }

    // (119:3) {#if 0 < 1*(item+page) && 1*(item+page) <= allpages}
    function create_if_block_1$2(ctx) {
    	var current;

    	var paginationitem = new PaginationItem({
    		props: {
    		active: ctx.item===1,
    		$$slots: { default: [create_default_slot_3$1] },
    		$$scope: { ctx }
    	},
    		$$inline: true
    	});

    	const block = {
    		c: function create() {
    			paginationitem.$$.fragment.c();
    		},

    		m: function mount(target, anchor) {
    			mount_component(paginationitem, target, anchor);
    			current = true;
    		},

    		p: function update(changed, ctx) {
    			var paginationitem_changes = {};
    			if (changed.$$scope || changed.page) paginationitem_changes.$$scope = { changed, ctx };
    			paginationitem.$set(paginationitem_changes);
    		},

    		i: function intro(local) {
    			if (current) return;
    			transition_in(paginationitem.$$.fragment, local);

    			current = true;
    		},

    		o: function outro(local) {
    			transition_out(paginationitem.$$.fragment, local);
    			current = false;
    		},

    		d: function destroy(detaching) {
    			destroy_component(paginationitem, detaching);
    		}
    	};
    	dispatch_dev("SvelteRegisterBlock", { block, id: create_if_block_1$2.name, type: "if", source: "(119:3) {#if 0 < 1*(item+page) && 1*(item+page) <= allpages}", ctx });
    	return block;
    }

    // (121:6) <PaginationLink          href="javacript:;"          on:click={()=>{page=1*(item+page)-1}}        >
    function create_default_slot_4$1(ctx) {
    	var t_value = 1*(ctx.item+ctx.page) + "", t;

    	const block = {
    		c: function create() {
    			t = text(t_value);
    		},

    		m: function mount(target, anchor) {
    			insert_dev(target, t, anchor);
    		},

    		p: function update(changed, ctx) {
    			if ((changed.page) && t_value !== (t_value = 1*(ctx.item+ctx.page) + "")) {
    				set_data_dev(t, t_value);
    			}
    		},

    		d: function destroy(detaching) {
    			if (detaching) {
    				detach_dev(t);
    			}
    		}
    	};
    	dispatch_dev("SvelteRegisterBlock", { block, id: create_default_slot_4$1.name, type: "slot", source: "(121:6) <PaginationLink          href=\"javacript:;\"          on:click={()=>{page=1*(item+page)-1}}        >", ctx });
    	return block;
    }

    // (120:4) <PaginationItem active={item===1}>
    function create_default_slot_3$1(ctx) {
    	var current;

    	function click_handler_3() {
    		return ctx.click_handler_3(ctx);
    	}

    	var paginationlink = new PaginationLink({
    		props: {
    		href: "javacript:;",
    		$$slots: { default: [create_default_slot_4$1] },
    		$$scope: { ctx }
    	},
    		$$inline: true
    	});
    	paginationlink.$on("click", click_handler_3);

    	const block = {
    		c: function create() {
    			paginationlink.$$.fragment.c();
    		},

    		m: function mount(target, anchor) {
    			mount_component(paginationlink, target, anchor);
    			current = true;
    		},

    		p: function update(changed, new_ctx) {
    			ctx = new_ctx;
    			var paginationlink_changes = {};
    			if (changed.$$scope || changed.page) paginationlink_changes.$$scope = { changed, ctx };
    			paginationlink.$set(paginationlink_changes);
    		},

    		i: function intro(local) {
    			if (current) return;
    			transition_in(paginationlink.$$.fragment, local);

    			current = true;
    		},

    		o: function outro(local) {
    			transition_out(paginationlink.$$.fragment, local);
    			current = false;
    		},

    		d: function destroy(detaching) {
    			destroy_component(paginationlink, detaching);
    		}
    	};
    	dispatch_dev("SvelteRegisterBlock", { block, id: create_default_slot_3$1.name, type: "slot", source: "(120:4) <PaginationItem active={item===1}>", ctx });
    	return block;
    }

    // (117:3) {#each [-1,0,1,2,3] as item}
    function create_each_block(ctx) {
    	var if_block_anchor, current;

    	var if_block = (0 < 1*(ctx.item+ctx.page) && 1*(ctx.item+ctx.page) <= ctx.allpages) && create_if_block_1$2(ctx);

    	const block = {
    		c: function create() {
    			if (if_block) if_block.c();
    			if_block_anchor = empty();
    		},

    		m: function mount(target, anchor) {
    			if (if_block) if_block.m(target, anchor);
    			insert_dev(target, if_block_anchor, anchor);
    			current = true;
    		},

    		p: function update(changed, ctx) {
    			if (0 < 1*(ctx.item+ctx.page) && 1*(ctx.item+ctx.page) <= ctx.allpages) {
    				if (if_block) {
    					if_block.p(changed, ctx);
    					transition_in(if_block, 1);
    				} else {
    					if_block = create_if_block_1$2(ctx);
    					if_block.c();
    					transition_in(if_block, 1);
    					if_block.m(if_block_anchor.parentNode, if_block_anchor);
    				}
    			} else if (if_block) {
    				group_outros();
    				transition_out(if_block, 1, 1, () => {
    					if_block = null;
    				});
    				check_outros();
    			}
    		},

    		i: function intro(local) {
    			if (current) return;
    			transition_in(if_block);
    			current = true;
    		},

    		o: function outro(local) {
    			transition_out(if_block);
    			current = false;
    		},

    		d: function destroy(detaching) {
    			if (if_block) if_block.d(detaching);

    			if (detaching) {
    				detach_dev(if_block_anchor);
    			}
    		}
    	};
    	dispatch_dev("SvelteRegisterBlock", { block, id: create_each_block.name, type: "each", source: "(117:3) {#each [-1,0,1,2,3] as item}", ctx });
    	return block;
    }

    // (130:3) {#if page !== allpages-1}
    function create_if_block$5(ctx) {
    	var current;

    	var paginationitem = new PaginationItem({
    		props: {
    		$$slots: { default: [create_default_slot_2$1] },
    		$$scope: { ctx }
    	},
    		$$inline: true
    	});

    	const block = {
    		c: function create() {
    			paginationitem.$$.fragment.c();
    		},

    		m: function mount(target, anchor) {
    			mount_component(paginationitem, target, anchor);
    			current = true;
    		},

    		i: function intro(local) {
    			if (current) return;
    			transition_in(paginationitem.$$.fragment, local);

    			current = true;
    		},

    		o: function outro(local) {
    			transition_out(paginationitem.$$.fragment, local);
    			current = false;
    		},

    		d: function destroy(detaching) {
    			destroy_component(paginationitem, detaching);
    		}
    	};
    	dispatch_dev("SvelteRegisterBlock", { block, id: create_if_block$5.name, type: "if", source: "(130:3) {#if page !== allpages-1}", ctx });
    	return block;
    }

    // (131:4) <PaginationItem>
    function create_default_slot_2$1(ctx) {
    	var current;

    	var paginationlink = new PaginationLink({
    		props: { next: true, href: "javacript:;" },
    		$$inline: true
    	});
    	paginationlink.$on("click", ctx.click_handler_4);

    	const block = {
    		c: function create() {
    			paginationlink.$$.fragment.c();
    		},

    		m: function mount(target, anchor) {
    			mount_component(paginationlink, target, anchor);
    			current = true;
    		},

    		p: noop,

    		i: function intro(local) {
    			if (current) return;
    			transition_in(paginationlink.$$.fragment, local);

    			current = true;
    		},

    		o: function outro(local) {
    			transition_out(paginationlink.$$.fragment, local);
    			current = false;
    		},

    		d: function destroy(detaching) {
    			destroy_component(paginationlink, detaching);
    		}
    	};
    	dispatch_dev("SvelteRegisterBlock", { block, id: create_default_slot_2$1.name, type: "slot", source: "(131:4) <PaginationItem>", ctx });
    	return block;
    }

    // (135:1) <PaginationItem>
    function create_default_slot_1$1(ctx) {
    	var current;

    	var paginationlink = new PaginationLink({
    		props: { last: true, href: "javacript:;" },
    		$$inline: true
    	});
    	paginationlink.$on("click", ctx.click_handler_5);

    	const block = {
    		c: function create() {
    			paginationlink.$$.fragment.c();
    		},

    		m: function mount(target, anchor) {
    			mount_component(paginationlink, target, anchor);
    			current = true;
    		},

    		p: noop,

    		i: function intro(local) {
    			if (current) return;
    			transition_in(paginationlink.$$.fragment, local);

    			current = true;
    		},

    		o: function outro(local) {
    			transition_out(paginationlink.$$.fragment, local);
    			current = false;
    		},

    		d: function destroy(detaching) {
    			destroy_component(paginationlink, detaching);
    		}
    	};
    	dispatch_dev("SvelteRegisterBlock", { block, id: create_default_slot_1$1.name, type: "slot", source: "(135:1) <PaginationItem>", ctx });
    	return block;
    }

    // (103:0) <Pagination    ariaLabel="Page navigation example"    class="pagination justify-content-center"  >
    function create_default_slot$2(ctx) {
    	var t0, t1, t2, t3, current;

    	var paginationitem0 = new PaginationItem({
    		props: {
    		$$slots: { default: [create_default_slot_6$1] },
    		$$scope: { ctx }
    	},
    		$$inline: true
    	});

    	var if_block0 = (ctx.page !== 0) && create_if_block_2$1(ctx);

    	let each_value = [-1,0,1,2,3];

    	let each_blocks = [];

    	for (let i = 0; i < 5; i += 1) {
    		each_blocks[i] = create_each_block(get_each_context(ctx, each_value, i));
    	}

    	const out = i => transition_out(each_blocks[i], 1, 1, () => {
    		each_blocks[i] = null;
    	});

    	var if_block1 = (ctx.page !== ctx.allpages-1) && create_if_block$5(ctx);

    	var paginationitem1 = new PaginationItem({
    		props: {
    		$$slots: { default: [create_default_slot_1$1] },
    		$$scope: { ctx }
    	},
    		$$inline: true
    	});

    	const block = {
    		c: function create() {
    			paginationitem0.$$.fragment.c();
    			t0 = space();
    			if (if_block0) if_block0.c();
    			t1 = space();

    			for (let i = 0; i < 5; i += 1) {
    				each_blocks[i].c();
    			}

    			t2 = space();
    			if (if_block1) if_block1.c();
    			t3 = space();
    			paginationitem1.$$.fragment.c();
    		},

    		m: function mount(target, anchor) {
    			mount_component(paginationitem0, target, anchor);
    			insert_dev(target, t0, anchor);
    			if (if_block0) if_block0.m(target, anchor);
    			insert_dev(target, t1, anchor);

    			for (let i = 0; i < 5; i += 1) {
    				each_blocks[i].m(target, anchor);
    			}

    			insert_dev(target, t2, anchor);
    			if (if_block1) if_block1.m(target, anchor);
    			insert_dev(target, t3, anchor);
    			mount_component(paginationitem1, target, anchor);
    			current = true;
    		},

    		p: function update(changed, ctx) {
    			var paginationitem0_changes = {};
    			if (changed.$$scope) paginationitem0_changes.$$scope = { changed, ctx };
    			paginationitem0.$set(paginationitem0_changes);

    			if (ctx.page !== 0) {
    				if (!if_block0) {
    					if_block0 = create_if_block_2$1(ctx);
    					if_block0.c();
    					transition_in(if_block0, 1);
    					if_block0.m(t1.parentNode, t1);
    				} else transition_in(if_block0, 1);
    			} else if (if_block0) {
    				group_outros();
    				transition_out(if_block0, 1, 1, () => {
    					if_block0 = null;
    				});
    				check_outros();
    			}

    			if (changed.page || changed.allpages) {
    				each_value = [-1,0,1,2,3];

    				let i;
    				for (i = 0; i < each_value.length; i += 1) {
    					const child_ctx = get_each_context(ctx, each_value, i);

    					if (each_blocks[i]) {
    						each_blocks[i].p(changed, child_ctx);
    						transition_in(each_blocks[i], 1);
    					} else {
    						each_blocks[i] = create_each_block(child_ctx);
    						each_blocks[i].c();
    						transition_in(each_blocks[i], 1);
    						each_blocks[i].m(t2.parentNode, t2);
    					}
    				}

    				group_outros();
    				for (i = each_value.length; i < 5; i += 1) {
    					out(i);
    				}
    				check_outros();
    			}

    			if (ctx.page !== ctx.allpages-1) {
    				if (!if_block1) {
    					if_block1 = create_if_block$5(ctx);
    					if_block1.c();
    					transition_in(if_block1, 1);
    					if_block1.m(t3.parentNode, t3);
    				} else transition_in(if_block1, 1);
    			} else if (if_block1) {
    				group_outros();
    				transition_out(if_block1, 1, 1, () => {
    					if_block1 = null;
    				});
    				check_outros();
    			}

    			var paginationitem1_changes = {};
    			if (changed.$$scope) paginationitem1_changes.$$scope = { changed, ctx };
    			paginationitem1.$set(paginationitem1_changes);
    		},

    		i: function intro(local) {
    			if (current) return;
    			transition_in(paginationitem0.$$.fragment, local);

    			transition_in(if_block0);

    			for (let i = 0; i < 5; i += 1) {
    				transition_in(each_blocks[i]);
    			}

    			transition_in(if_block1);

    			transition_in(paginationitem1.$$.fragment, local);

    			current = true;
    		},

    		o: function outro(local) {
    			transition_out(paginationitem0.$$.fragment, local);
    			transition_out(if_block0);

    			each_blocks = each_blocks.filter(Boolean);
    			for (let i = 0; i < 5; i += 1) {
    				transition_out(each_blocks[i]);
    			}

    			transition_out(if_block1);
    			transition_out(paginationitem1.$$.fragment, local);
    			current = false;
    		},

    		d: function destroy(detaching) {
    			destroy_component(paginationitem0, detaching);

    			if (detaching) {
    				detach_dev(t0);
    			}

    			if (if_block0) if_block0.d(detaching);

    			if (detaching) {
    				detach_dev(t1);
    			}

    			destroy_each(each_blocks, detaching);

    			if (detaching) {
    				detach_dev(t2);
    			}

    			if (if_block1) if_block1.d(detaching);

    			if (detaching) {
    				detach_dev(t3);
    			}

    			destroy_component(paginationitem1, detaching);
    		}
    	};
    	dispatch_dev("SvelteRegisterBlock", { block, id: create_default_slot$2.name, type: "slot", source: "(103:0) <Pagination    ariaLabel=\"Page navigation example\"    class=\"pagination justify-content-center\"  >", ctx });
    	return block;
    }

    function create_fragment$h(ctx) {
    	var div0, div0_resize_listener, t0, t1, div1, input, t2, t3, current, dispose;

    	var jumbotron = new Jumbotron({ $$inline: true });

    	var table = new Table({
    		props: {
    		$$slots: { default: [create_default_slot_7$1] },
    		$$scope: { ctx }
    	},
    		$$inline: true
    	});

    	var pagination = new Pagination({
    		props: {
    		ariaLabel: "Page navigation example",
    		class: "pagination justify-content-center",
    		$$slots: { default: [create_default_slot$2] },
    		$$scope: { ctx }
    	},
    		$$inline: true
    	});

    	const block = {
    		c: function create() {
    			div0 = element("div");
    			t0 = space();
    			jumbotron.$$.fragment.c();
    			t1 = space();
    			div1 = element("div");
    			input = element("input");
    			t2 = space();
    			table.$$.fragment.c();
    			t3 = space();
    			pagination.$$.fragment.c();
    			add_render_callback(() => ctx.div0_resize_handler.call(div0));
    			set_style(div0, "width", "100vw");
    			add_location(div0, file_1, 72, 0, 1445);
    			attr_dev(input, "type", "text");
    			attr_dev(input, "placeholder", "请输入检索内容");
    			attr_dev(input, "class", "form-control");
    			add_location(input, file_1, 76, 1, 1569);
    			attr_dev(div1, "class", "input-group");
    			set_style(div1, "padding", "10px");
    			add_location(div1, file_1, 75, 0, 1519);
    			dispose = listen_dev(input, "input", ctx.input_input_handler);
    		},

    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},

    		m: function mount(target, anchor) {
    			insert_dev(target, div0, anchor);
    			div0_resize_listener = add_resize_listener(div0, ctx.div0_resize_handler.bind(div0));
    			insert_dev(target, t0, anchor);
    			mount_component(jumbotron, target, anchor);
    			insert_dev(target, t1, anchor);
    			insert_dev(target, div1, anchor);
    			append_dev(div1, input);

    			set_input_value(input, ctx.search);

    			insert_dev(target, t2, anchor);
    			mount_component(table, target, anchor);
    			insert_dev(target, t3, anchor);
    			mount_component(pagination, target, anchor);
    			current = true;
    		},

    		p: function update(changed, ctx) {
    			if (changed.search && (input.value !== ctx.search)) set_input_value(input, ctx.search);

    			var table_changes = {};
    			if (changed.$$scope || changed.getSearch || changed.page || changed.size) table_changes.$$scope = { changed, ctx };
    			table.$set(table_changes);

    			var pagination_changes = {};
    			if (changed.$$scope || changed.page || changed.allpages) pagination_changes.$$scope = { changed, ctx };
    			pagination.$set(pagination_changes);
    		},

    		i: function intro(local) {
    			if (current) return;
    			transition_in(jumbotron.$$.fragment, local);

    			transition_in(table.$$.fragment, local);

    			transition_in(pagination.$$.fragment, local);

    			current = true;
    		},

    		o: function outro(local) {
    			transition_out(jumbotron.$$.fragment, local);
    			transition_out(table.$$.fragment, local);
    			transition_out(pagination.$$.fragment, local);
    			current = false;
    		},

    		d: function destroy(detaching) {
    			if (detaching) {
    				detach_dev(div0);
    			}

    			div0_resize_listener.cancel();

    			if (detaching) {
    				detach_dev(t0);
    			}

    			destroy_component(jumbotron, detaching);

    			if (detaching) {
    				detach_dev(t1);
    				detach_dev(div1);
    				detach_dev(t2);
    			}

    			destroy_component(table, detaching);

    			if (detaching) {
    				detach_dev(t3);
    			}

    			destroy_component(pagination, detaching);

    			dispose();
    		}
    	};
    	dispatch_dev("SvelteRegisterBlock", { block, id: create_fragment$h.name, type: "component", source: "", ctx });
    	return block;
    }

    function instance$f($$self, $$props, $$invalidate) {
    	

        onMount(()=>{
        	getSource((e)=>{
        		$$invalidate('source', source = e.json);
        		for(let i in source) {
        			$$invalidate('source', source[i].id = i, source);
        		}
        		$$invalidate('source', source = source.slice(1));
        		
        	});

        });

        function goView(id) {
        	let file_id = 0;
        	for(let i in source) {
        		if(source[i].id === id) {
        			file_id = i;
        		} 		
        	}
        	navigate("./" + source[file_id].DATA0, { replace: true });
        	changePage.update( v => !v );
        }


        //set body data
        let { file } = $$props;
        let source = [];
        let allpages;
        let page = 0;
        let search;
        let width;

    	const writable_props = ['file'];
    	Object.keys($$props).forEach(key => {
    		if (!writable_props.includes(key) && !key.startsWith('$$')) console_1.warn(`<List> was created with unknown prop '${key}'`);
    	});

    	function div0_resize_handler() {
    		width = this.offsetWidth;
    		$$invalidate('width', width);
    	}

    	function input_input_handler() {
    		search = this.value;
    		$$invalidate('search', search);
    	}

    	const click_handler = ({ item }) => {goView(item.id);};

    	const click_handler_1 = () => {$$invalidate('page', page=0);};

    	const click_handler_2 = () => {$$invalidate('page', page--, page);};

    	const click_handler_3 = ({ item }) => {$$invalidate('page', page=1*(item+page)-1);};

    	const click_handler_4 = () => {$$invalidate('page', page++, page);};

    	const click_handler_5 = () => {$$invalidate('page', page=allpages-1);};

    	$$self.$set = $$props => {
    		if ('file' in $$props) $$invalidate('file', file = $$props.file);
    	};

    	$$self.$capture_state = () => {
    		return { file, source, allpages, page, search, width, getSearch, size };
    	};

    	$$self.$inject_state = $$props => {
    		if ('file' in $$props) $$invalidate('file', file = $$props.file);
    		if ('source' in $$props) $$invalidate('source', source = $$props.source);
    		if ('allpages' in $$props) $$invalidate('allpages', allpages = $$props.allpages);
    		if ('page' in $$props) $$invalidate('page', page = $$props.page);
    		if ('search' in $$props) $$invalidate('search', search = $$props.search);
    		if ('width' in $$props) $$invalidate('width', width = $$props.width);
    		if ('getSearch' in $$props) $$invalidate('getSearch', getSearch = $$props.getSearch);
    		if ('size' in $$props) $$invalidate('size', size = $$props.size);
    	};

    	let getSearch, size;

    	$$self.$$.update = ($$dirty = { width: 1, size: 1, source: 1, search: 1 }) => {
    		if ($$dirty.width) { $$invalidate('size', size = (width < 750) ? 10 : 6); }
    		if ($$dirty.size || $$dirty.source || $$dirty.search) { $$invalidate('getSearch', getSearch = (function(source, search){
            	let result = [];
            	if(search === undefined) {
            		$$invalidate('allpages', allpages = Math.ceil(source.length/size));
            		return source;
            	}
            	for(let i in source) {
            		if(source[i].DATA1.includes(search)) {
            			result.push(source[i]);
            		}
            	} 
            	$$invalidate('allpages', allpages = Math.ceil(result.length/size));
            	$$invalidate('page', page = 0);
            	console.log(result);
            	return result;
            })(source, search)); }
    	};

    	return {
    		goView,
    		file,
    		allpages,
    		page,
    		search,
    		width,
    		getSearch,
    		size,
    		div0_resize_handler,
    		input_input_handler,
    		click_handler,
    		click_handler_1,
    		click_handler_2,
    		click_handler_3,
    		click_handler_4,
    		click_handler_5
    	};
    }

    class List extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$f, create_fragment$h, safe_not_equal, ["file"]);
    		dispatch_dev("SvelteRegisterComponent", { component: this, tagName: "List", options, id: create_fragment$h.name });

    		const { ctx } = this.$$;
    		const props = options.props || {};
    		if (ctx.file === undefined && !('file' in props)) {
    			console_1.warn("<List> was created without expected prop 'file'");
    		}
    	}

    	get file() {
    		throw new Error("<List>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set file(value) {
    		throw new Error("<List>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* src\router\Home\Iframe.svelte generated by Svelte v3.12.1 */

    const file_1$1 = "src\\router\\Home\\Iframe.svelte";

    function create_fragment$i(ctx) {
    	var div, iframe, iframe_src_value;

    	const block = {
    		c: function create() {
    			div = element("div");
    			iframe = element("iframe");
    			attr_dev(iframe, "border", "0");
    			attr_dev(iframe, "src", iframe_src_value = "./source#/" + ctx.file);
    			attr_dev(iframe, "class", "_main_iframe svelte-106wxlx");
    			attr_dev(iframe, "title", "docsify_docs");
    			add_location(iframe, file_1$1, 51, 1, 920);
    			add_location(div, file_1$1, 50, 0, 912);
    		},

    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},

    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    			append_dev(div, iframe);
    		},

    		p: function update(changed, ctx) {
    			if ((changed.file) && iframe_src_value !== (iframe_src_value = "./source#/" + ctx.file)) {
    				attr_dev(iframe, "src", iframe_src_value);
    			}
    		},

    		i: noop,
    		o: noop,

    		d: function destroy(detaching) {
    			if (detaching) {
    				detach_dev(div);
    			}
    		}
    	};
    	dispatch_dev("SvelteRegisterBlock", { block, id: create_fragment$i.name, type: "component", source: "", ctx });
    	return block;
    }

    function instance$g($$self, $$props, $$invalidate) {
    	

        onMount(()=>{
        	getSource((e)=>{
        		for(let i=0; i < (e.json).length; i++) {
        			if(file === (e.json)[i].DATA0 && i !== 0) {
        				navigate("./" + file, { replace: true });
        				document.title = 'Docs --文档: '+file;
        				break;
        			}
        			if(i === (e.json).length-1) {
        				navigate("./home", { replace: true });
        				document.title = 'Docs --首页';
        			}
        		}
        	});

        });

        //set body data
        let { file } = $$props;

    	const writable_props = ['file'];
    	Object.keys($$props).forEach(key => {
    		if (!writable_props.includes(key) && !key.startsWith('$$')) console.warn(`<Iframe> was created with unknown prop '${key}'`);
    	});

    	$$self.$set = $$props => {
    		if ('file' in $$props) $$invalidate('file', file = $$props.file);
    	};

    	$$self.$capture_state = () => {
    		return { file };
    	};

    	$$self.$inject_state = $$props => {
    		if ('file' in $$props) $$invalidate('file', file = $$props.file);
    	};

    	return { file };
    }

    class Iframe extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$g, create_fragment$i, safe_not_equal, ["file"]);
    		dispatch_dev("SvelteRegisterComponent", { component: this, tagName: "Iframe", options, id: create_fragment$i.name });

    		const { ctx } = this.$$;
    		const props = options.props || {};
    		if (ctx.file === undefined && !('file' in props)) {
    			console.warn("<Iframe> was created without expected prop 'file'");
    		}
    	}

    	get file() {
    		throw new Error("<Iframe>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set file(value) {
    		throw new Error("<Iframe>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* src\router\Home\index.svelte generated by Svelte v3.12.1 */

    // (23:0) {:else}
    function create_else_block$4(ctx) {
    	var current;

    	var list = new List({ $$inline: true });

    	const block = {
    		c: function create() {
    			list.$$.fragment.c();
    		},

    		m: function mount(target, anchor) {
    			mount_component(list, target, anchor);
    			current = true;
    		},

    		p: noop,

    		i: function intro(local) {
    			if (current) return;
    			transition_in(list.$$.fragment, local);

    			current = true;
    		},

    		o: function outro(local) {
    			transition_out(list.$$.fragment, local);
    			current = false;
    		},

    		d: function destroy(detaching) {
    			destroy_component(list, detaching);
    		}
    	};
    	dispatch_dev("SvelteRegisterBlock", { block, id: create_else_block$4.name, type: "else", source: "(23:0) {:else}", ctx });
    	return block;
    }

    // (21:0) {#if $changePage}
    function create_if_block$6(ctx) {
    	var current;

    	var iframe = new Iframe({
    		props: { file: ctx.file },
    		$$inline: true
    	});

    	const block = {
    		c: function create() {
    			iframe.$$.fragment.c();
    		},

    		m: function mount(target, anchor) {
    			mount_component(iframe, target, anchor);
    			current = true;
    		},

    		p: function update(changed, ctx) {
    			var iframe_changes = {};
    			if (changed.file) iframe_changes.file = ctx.file;
    			iframe.$set(iframe_changes);
    		},

    		i: function intro(local) {
    			if (current) return;
    			transition_in(iframe.$$.fragment, local);

    			current = true;
    		},

    		o: function outro(local) {
    			transition_out(iframe.$$.fragment, local);
    			current = false;
    		},

    		d: function destroy(detaching) {
    			destroy_component(iframe, detaching);
    		}
    	};
    	dispatch_dev("SvelteRegisterBlock", { block, id: create_if_block$6.name, type: "if", source: "(21:0) {#if $changePage}", ctx });
    	return block;
    }

    function create_fragment$j(ctx) {
    	var t0, current_block_type_index, if_block, t1, current;

    	var nav = new Nav_1({ $$inline: true });

    	var if_block_creators = [
    		create_if_block$6,
    		create_else_block$4
    	];

    	var if_blocks = [];

    	function select_block_type(changed, ctx) {
    		if (ctx.$changePage) return 0;
    		return 1;
    	}

    	current_block_type_index = select_block_type(null, ctx);
    	if_block = if_blocks[current_block_type_index] = if_block_creators[current_block_type_index](ctx);

    	var footer = new Footer({ $$inline: true });

    	const block = {
    		c: function create() {
    			nav.$$.fragment.c();
    			t0 = space();
    			if_block.c();
    			t1 = space();
    			footer.$$.fragment.c();
    		},

    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},

    		m: function mount(target, anchor) {
    			mount_component(nav, target, anchor);
    			insert_dev(target, t0, anchor);
    			if_blocks[current_block_type_index].m(target, anchor);
    			insert_dev(target, t1, anchor);
    			mount_component(footer, target, anchor);
    			current = true;
    		},

    		p: function update(changed, ctx) {
    			var previous_block_index = current_block_type_index;
    			current_block_type_index = select_block_type(changed, ctx);
    			if (current_block_type_index === previous_block_index) {
    				if_blocks[current_block_type_index].p(changed, ctx);
    			} else {
    				group_outros();
    				transition_out(if_blocks[previous_block_index], 1, 1, () => {
    					if_blocks[previous_block_index] = null;
    				});
    				check_outros();

    				if_block = if_blocks[current_block_type_index];
    				if (!if_block) {
    					if_block = if_blocks[current_block_type_index] = if_block_creators[current_block_type_index](ctx);
    					if_block.c();
    				}
    				transition_in(if_block, 1);
    				if_block.m(t1.parentNode, t1);
    			}
    		},

    		i: function intro(local) {
    			if (current) return;
    			transition_in(nav.$$.fragment, local);

    			transition_in(if_block);

    			transition_in(footer.$$.fragment, local);

    			current = true;
    		},

    		o: function outro(local) {
    			transition_out(nav.$$.fragment, local);
    			transition_out(if_block);
    			transition_out(footer.$$.fragment, local);
    			current = false;
    		},

    		d: function destroy(detaching) {
    			destroy_component(nav, detaching);

    			if (detaching) {
    				detach_dev(t0);
    			}

    			if_blocks[current_block_type_index].d(detaching);

    			if (detaching) {
    				detach_dev(t1);
    			}

    			destroy_component(footer, detaching);
    		}
    	};
    	dispatch_dev("SvelteRegisterBlock", { block, id: create_fragment$j.name, type: "component", source: "", ctx });
    	return block;
    }

    function instance$h($$self, $$props, $$invalidate) {
    	let $changePage;

    	validate_store(changePage, 'changePage');
    	component_subscribe($$self, changePage, $$value => { $changePage = $$value; $$invalidate('$changePage', $changePage); });

    	

        //set body data
        let { file } = $$props;

    	const writable_props = ['file'];
    	Object.keys($$props).forEach(key => {
    		if (!writable_props.includes(key) && !key.startsWith('$$')) console.warn(`<Index> was created with unknown prop '${key}'`);
    	});

    	$$self.$set = $$props => {
    		if ('file' in $$props) $$invalidate('file', file = $$props.file);
    	};

    	$$self.$capture_state = () => {
    		return { file, $changePage };
    	};

    	$$self.$inject_state = $$props => {
    		if ('file' in $$props) $$invalidate('file', file = $$props.file);
    		if ('$changePage' in $$props) changePage.set($changePage);
    	};

    	return { file, $changePage };
    }

    class Index extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$h, create_fragment$j, safe_not_equal, ["file"]);
    		dispatch_dev("SvelteRegisterComponent", { component: this, tagName: "Index", options, id: create_fragment$j.name });

    		const { ctx } = this.$$;
    		const props = options.props || {};
    		if (ctx.file === undefined && !('file' in props)) {
    			console.warn("<Index> was created without expected prop 'file'");
    		}
    	}

    	get file() {
    		throw new Error("<Index>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set file(value) {
    		throw new Error("<Index>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* src\App.svelte generated by Svelte v3.12.1 */

    const file$f = "src\\App.svelte";

    // (21:3) <Route path="/:file" let:params>
    function create_default_slot_1$2(ctx) {
    	var current;

    	var home = new Index({
    		props: { file: ctx.params.file },
    		$$inline: true
    	});

    	const block = {
    		c: function create() {
    			home.$$.fragment.c();
    		},

    		m: function mount(target, anchor) {
    			mount_component(home, target, anchor);
    			current = true;
    		},

    		p: function update(changed, ctx) {
    			var home_changes = {};
    			if (changed.params) home_changes.file = ctx.params.file;
    			home.$set(home_changes);
    		},

    		i: function intro(local) {
    			if (current) return;
    			transition_in(home.$$.fragment, local);

    			current = true;
    		},

    		o: function outro(local) {
    			transition_out(home.$$.fragment, local);
    			current = false;
    		},

    		d: function destroy(detaching) {
    			destroy_component(home, detaching);
    		}
    	};
    	dispatch_dev("SvelteRegisterBlock", { block, id: create_default_slot_1$2.name, type: "slot", source: "(21:3) <Route path=\"/:file\" let:params>", ctx });
    	return block;
    }

    // (19:0) <Router>
    function create_default_slot$3(ctx) {
    	var t, current;

    	var route0 = new Route({
    		props: { path: "/", component: Index },
    		$$inline: true
    	});

    	var route1 = new Route({
    		props: {
    		path: "/:file",
    		$$slots: {
    		default: [create_default_slot_1$2, ({ params }) => ({ params })]
    	},
    		$$scope: { ctx }
    	},
    		$$inline: true
    	});

    	const block = {
    		c: function create() {
    			route0.$$.fragment.c();
    			t = space();
    			route1.$$.fragment.c();
    		},

    		m: function mount(target, anchor) {
    			mount_component(route0, target, anchor);
    			insert_dev(target, t, anchor);
    			mount_component(route1, target, anchor);
    			current = true;
    		},

    		p: function update(changed, ctx) {
    			var route1_changes = {};
    			if (changed.$$scope) route1_changes.$$scope = { changed, ctx };
    			route1.$set(route1_changes);
    		},

    		i: function intro(local) {
    			if (current) return;
    			transition_in(route0.$$.fragment, local);

    			transition_in(route1.$$.fragment, local);

    			current = true;
    		},

    		o: function outro(local) {
    			transition_out(route0.$$.fragment, local);
    			transition_out(route1.$$.fragment, local);
    			current = false;
    		},

    		d: function destroy(detaching) {
    			destroy_component(route0, detaching);

    			if (detaching) {
    				detach_dev(t);
    			}

    			destroy_component(route1, detaching);
    		}
    	};
    	dispatch_dev("SvelteRegisterBlock", { block, id: create_default_slot$3.name, type: "slot", source: "(19:0) <Router>", ctx });
    	return block;
    }

    function create_fragment$k(ctx) {
    	var link0, link1, link2, t, current;

    	var router = new Router({
    		props: {
    		$$slots: { default: [create_default_slot$3] },
    		$$scope: { ctx }
    	},
    		$$inline: true
    	});

    	const block = {
    		c: function create() {
    			link0 = element("link");
    			link1 = element("link");
    			link2 = element("link");
    			t = space();
    			router.$$.fragment.c();
    			attr_dev(link0, "rel", "stylesheet");
    			attr_dev(link0, "href", "https://cdn.staticfile.org/font-awesome/4.7.0/css/font-awesome.css");
    			add_location(link0, file$f, 9, 1, 141);
    			attr_dev(link1, "rel", "stylesheet");
    			attr_dev(link1, "href", "./css/bootstrap.css");
    			add_location(link1, file$f, 10, 1, 240);
    			attr_dev(link2, "rel", "stylesheet");
    			attr_dev(link2, "href", "./css/bundle.css");
    			add_location(link2, file$f, 11, 1, 292);
    		},

    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},

    		m: function mount(target, anchor) {
    			append_dev(document.head, link0);
    			append_dev(document.head, link1);
    			append_dev(document.head, link2);
    			insert_dev(target, t, anchor);
    			mount_component(router, target, anchor);
    			current = true;
    		},

    		p: function update(changed, ctx) {
    			var router_changes = {};
    			if (changed.$$scope) router_changes.$$scope = { changed, ctx };
    			router.$set(router_changes);
    		},

    		i: function intro(local) {
    			if (current) return;
    			transition_in(router.$$.fragment, local);

    			current = true;
    		},

    		o: function outro(local) {
    			transition_out(router.$$.fragment, local);
    			current = false;
    		},

    		d: function destroy(detaching) {
    			detach_dev(link0);
    			detach_dev(link1);
    			detach_dev(link2);

    			if (detaching) {
    				detach_dev(t);
    			}

    			destroy_component(router, detaching);
    		}
    	};
    	dispatch_dev("SvelteRegisterBlock", { block, id: create_fragment$k.name, type: "component", source: "", ctx });
    	return block;
    }

    class App extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, null, create_fragment$k, safe_not_equal, []);
    		dispatch_dev("SvelteRegisterComponent", { component: this, tagName: "App", options, id: create_fragment$k.name });
    	}
    }

    var app$1 = new App({
    	target: document.body
    });

    return app$1;

}());
//# sourceMappingURL=bundle.js.map
