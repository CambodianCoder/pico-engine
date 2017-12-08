var _ = require("lodash");
var ktypes = require("krl-stdlib/types");
var mkKRLfn = require("../mkKRLfn");

module.exports = function(core){
    return {
        get: function(ctx, id, callback){
            var key = ctx.getMyKey(id);
            if(key === void 0 || key === null){
                callback(new Error("keys:" + id + " not defined"));
                return;
            }
            callback(null, mkKRLfn([
                "name",
            ], function(ctx, args, callback){
                var name = args.name;
                if(name === null || name === void 0){
                    //if no name given, just return the whole key
                    callback(null, key);
                    return;
                }
                if(!_.has(key, name)){
                    //the user must know ASAP when they try and use a sub-key that doesn't exist
                    callback(new Error("keys:" + id + "(" + ktypes.encode(name) + ") not defined"));
                    return;
                }
                callback(null, key[name]);
            }));
        }
    };
};
