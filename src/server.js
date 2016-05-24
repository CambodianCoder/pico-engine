var _ = require('lodash');
var url = require('url');
var path = require('path');
var http = require('http');
var PicoEngine = require('./');
var HttpHashRouter = require('http-hash-router');

var pe = PicoEngine({
  db: {
    path: path.resolve(__dirname, '../db')
  }
});

var port = process.env.PORT || 8080;

var router = HttpHashRouter();

var jsonResp = function(res, data){
  res.end(JSON.stringify(data, undefined, 2));
};

var errResp = function(res, err){
  res.statusCode = err.statusCode || 500;
  res.end(err.message);
};


router.set('/sky/event/:eci/:eid/:domain/:type', function(req, res, route){
  var event = {
    eci: route.params.eci,
    eid: route.params.eid,
    domain: route.params.domain,
    type: route.params.type,
    attrs: route.data
  };
  pe.signalEvent(event, function(err, response){
    if(err) return errResp(res, err);
    if(response.type === 'json'){
      jsonResp(res, response.data);
    }else if(response.type === 'raw'){
      response.resFn(res);
    }else{
      errResp(res, new Error('Invalid response type: ' + response.type));
    }
  });
});

router.set('/sky/cloud/:rid/:function', function(req, res, route){
  var ctx = {
    eci: route.data['_eci'],
    rid: route.params.rid,
    fn_name: route.params['function'],
    args: _.omit(route.data, '_eci')
  };

  pe.callFunction(ctx, function(err, data){
    if(err) return errResp(res, err);
    if(_.isFunction(data)){
      data(res);
    }else{
      jsonResp(res, data);
    }
  });
});

router.set('/', function(req, res, route){
  pe.db.toObj(function(err, db_data){
    if(err) return errResp(res, err);

    var html = '';
    html += '<html><body>';
    html += '<h1>Picos</h1>';
    _.each(db_data.pico, function(pico){
      html += '<div style="margin-left:2em">';
      html += '<h2>'+pico.id+'</h1>';
      html += '<div style="margin-left:2em">';

      html += '<h4>Channels</h4>';
      html += '<ul>';
      _.each(pico.channel, function(chan){
        var rm_link = '/api/pico/'+pico.id+'/rm-channel/'+chan.id;
        html += '<li>'+JSON.stringify(chan)+' <a href="'+rm_link+'">del</a></li>';
      });
      html += '</ul>';

      html += '<form action="/api/pico/'+pico.id+'/new-channel" method="GET">';
      html += '<input type="text" name="name" placeholder="name...">';
      html += '<input type="text" name="type" placeholder="type...">';
      html += '<button type="submit">add channel</button>';
      html += '</form>';

      html += '<h4>Rulesets</h4>';
      html += '<ul>';
      _.each(pico.ruleset, function(d, rid){
        var rm_link = '/api/pico/'+pico.id+'/rm-ruleset/'+rid;
        html += '<li>'+rid+' <a href="'+rm_link+'">del</a></li>';
      });
      html += '</ul>';

      html += '<form action="/api/pico/'+pico.id+'/add-ruleset" method="GET">';
      html += '<input type="text" name="rid" placeholder="Ruleset id...">';
      html += '<button type="submit">add ruleset</button>';
      html += '</form>';

      html += '<h4>`ent` Variables</h4>';
      html += '<ul>';
      _.each(pico.vars, function(v, k){
        html += '<li>'+k+' = '+v+'</li>';
      });
      html += '</ul>';

      html += '</div>';
      html += '</div>';
    });
    html += '<div style="margin-left:2em">';
    html += '<a href="/api/new-pico">add pico</a>';
    html += '</div>';
    html += '<hr/>';
    html += '<pre>' + JSON.stringify(db_data, undefined, 2) + '</pre>';
    res.end(html);
  });
});

router.set('/api/new-pico', function(req, res, route){
  pe.db.newPico({}, function(err, new_pico){
    if(err) return errResp(res, err);
    res.end(JSON.stringify(new_pico, undefined, 2));
  });
});

router.set('/api/pico/:id/new-channel', function(req, res, route){
  pe.db.newChannel({
    pico_id: route.params.id,
    name: route.data.name,
    type: route.data.type
  }, function(err, new_channel){
    if(err) return errResp(res, err);
    res.end(JSON.stringify(new_channel, undefined, 2));
  });
});

router.set('/api/pico/:id/rm-channel/:eci', function(req, res, route){
  pe.db.removeChannel(route.params.id, route.params.eci, function(err){
    if(err) return errResp(res, err);
    jsonResp(res, {ok: true});
  });
});

router.set('/api/pico/:id/rm-ruleset/:rid', function(req, res, route){
  pe.db.removeRuleset(route.params.id, route.params.rid, function(err){
    if(err) return errResp(res, err);
    jsonResp(res, {ok: true});
  });
});

router.set('/api/pico/:id/add-ruleset', function(req, res, route){
  pe.db.addRuleset({pico_id: route.params.id, rid: route.data.rid}, function(err){
    if(err) return errResp(res, err);
    jsonResp(res, {ok: true});
  });
});

var server = http.createServer(function(req, res){
  router(req, res, {
    data: url.parse(req.url, true).query
  }, function(err){
    if(err){
      errResp(res, err);
    }
  });
});

server.listen(port, function(){
  console.log('http://localhost:' + server.address().port);
});
