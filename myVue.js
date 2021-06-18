// 访问this.msg => this.$data.msg (对实例的data进行代理，先生成this.xxx,实际上修改、访问this.xxx都是针对this.$data.xxx)
class Vue {
  constructor(options) {
    this.$options = options;
    this.$data = typeof options.data === 'function' ? options.data() : {};
    const el = options.el;
    this.$el = typeof el === 'string' ? document.querySelector(el) : el;

    this.proxyData();
    new Observer(this.$data, this);
    new Compiler(this);
  }
  // 数据代理，在vm对象上挂载this.xxx
  proxyData() {
    Object.keys(this.$data).forEach((key) => {
      Object.defineProperty(this, key, {
        enumerable: true,
        configurable: false,
        get() {
          return this.$data[key];
        },
        set(newVal) {
          this.$data[key] === newVal ? undefined : (this.$data[key] = newVal);
        },
      });
    });
  }
}
// 数据劫持(对$data中的数据进行劫持)
class Observer {
  constructor(data) {
    this.$data = data;
    Object.keys(this.$data).forEach((key) => {
      // 循环获取key以及value传递到defineProperty，因为get直接返回自身会造成内存泄漏（死循环）
      this.defineReactive(this.$data, key, this.$data[key]);
    });
  }
  defineReactive(data, key, value) {
    Object.defineProperty(data, key, {
      get() {
        return value;
      },
      set(newVal) {
        if (newVal === value) return; //避免触发emit浪费内存
        value = newVal;
        bus.$emit(key);
      },
    });
  }
}
// 模板编译
class Compiler {
  constructor(vm) {
    this.$vm = vm;
    this.compile(this.$vm.$el);
  }
  // 编译
  compile(el) {
    Array.from(el.childNodes).forEach((node) => {
      if (this.isTextNode(node)) {
        this.compileTextNode(node);
      }
      if (this.isElementNode(node)) {
        this.compileElementNode(node);
        this.compile(node);
      }
    });
  }
  // 编译文本节点
  compileTextNode(node) {
    let txtValue = node.textContent;
    let reg = new RegExp(/\{\{(.+)?\}\}/);
    if (reg.test(txtValue)) {
      const key = RegExp.$1.trim();
      node.textContent = this.$vm.$data[key];
      bus.$on(key, () => {
        node.textContent = this.$vm.$data[key];
      });
    }
  }
  // 编译元素节点
  compileElementNode(node) {
    Array.from(node.attributes).forEach((attr) => {
      const attrName = attr.name;
      const attrValue = attr.value;
      if (this.isDirective(attrName)) {
        if (attrName === 'v-text') {
          node.textContent = this.$vm.$data[attrValue];
          bus.$on(attrValue, () => {
            node.textContent = this.$vm.$data[attrValue];
          });
        }
        if (attrName === 'v-model') {
          node.value = this.$vm.$data[attrValue];
          node.oninput = ()=>{
            this.$vm.$data[attrValue] = node.value
        }
          bus.$on(attrValue, () => {
            node.value = this.$vm.$data[attrValue];
          });
        }
      }
    });
  }
  // 判断文本节点
  isTextNode(node) {
    return node.nodeType === 3;
  }
  // 判断元素节点
  isElementNode(node) {
    return node.nodeType === 1;
  }
  // 是否是指令（v-开头）
  isDirective(attrName) {
    return attrName.startsWith('v-');
  }
}

// 事件发布订阅
class Bus {
  constructor() {
    this.buses = {};
  }
  $on(type, cb) {
    this.buses[type] = this.buses[type] || [];
    this.buses[type].push(cb);
  }
  $emit(type, ...rest) {
    let result = undefined;
    if (this.buses[type]) {
      this.buses[type].forEach((event) => {
        result = event.apply(this, rest);
      });
    }
    return result;
  }
}
const bus = new Bus();
