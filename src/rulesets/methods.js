module.exports = {
  'name': 'io.picolabs.methods',
  'meta': { 'shares': ['cap_hello'] },
  'global': function (ctx) {
    ctx.scope.set('cap_hello', ctx.mk.String('Hello World')['capitalize'](ctx, []));
  },
  'rules': {}
};
