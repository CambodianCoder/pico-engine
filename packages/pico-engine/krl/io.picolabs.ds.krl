ruleset io.picolabs.ds {
  meta {
    description <<
    An inter-ruleset key-value datastore system that can be added to and changes listened for using events.
    It can also be queried.
    >>
    shares __testing, getItem, allDomainData, viewStore
    provides getItem, allDomainData
  }
  global {
    __testing = { "queries":
      [ { "name": "__testing" }
      , { "name": "getItem", "args": [ "domain","key" ] }
      , { "name": "allDomainData", "args": [ "domain" ] }
      , { "name": "viewStore", "args": [] }
      ] , "events":
      [ { "domain": "wrangler", "type": "ds_update", "attrs":["domain","key","value"] }
      //, { "domain": "d2", "type": "t2", "attrs": [ "a1", "a2" ] }
      ]
    }
    
    getItem = function(domain, key) {
      ent:ds{[domain, key]}
    }
    
    allDomainData = function(domain) {
      ent:ds{domain}
    }
    
    viewStore = function() {
      ent:ds
    }
  }
  
  rule set_up {
    select when wrangler ruleset_added where rids >< meta:rid
    always {
      ent:ds := {};
      raise wrangler event "ds_ready" attributes event:attrs
    }
  }
  
  rule updateData {
    select when wrangler ds_update
    pre {
      domain = event:attr("domain")
      key = event:attr("key")
      value = event:attr("value")
      keyIsString = key && key.typeof() == "String"
      domainIsString = domain && domain.typeof() == "String"
    }
    if keyIsString && domainIsString then
    noop()
    fired {
     ent:ds{[domain, key]} := value;
     raise wrangler event "ds_updated" attributes event:attrs.put({
       "domain":domain,
       "key":key,
       "value":value
     })
    } else {
      raise wrangler event "unable_to_update_ds" attributes event:attrs.put({
        "domainGiven": domain.as("Boolean"),
        "keyGiven": key.as("Boolean"),
        "valueGiven": value.as("Boolean"),
        "keyIsString": keyIsString,
        "domainIsString": domainIsString
      })
    }
  }
  
  rule updateDomain {
    select when wrangler ds_assign_map_to_domain
    pre {
      domain = event:attr("domain")
      newMap = event:attr("map")
      domainIsString = domain.typeof() == "String"
      newMapIsMap = newMap.typeof() == "Map"
    }
    if domain && newMap && domainIsString && newMapIsMap then
    noop()
    fired {
      ent:ds{domain} := newMap;
      raise wrangler event "ds_domain_updated" attributes event:attrs.put({
        "domain": domain
      })
    }
  }
  
}
