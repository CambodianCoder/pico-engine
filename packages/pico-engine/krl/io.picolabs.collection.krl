ruleset io.picolabs.collection {
  meta {
    description <<
      Wrapper around subscription ruleset
      for managing a collection of member picos.
      Raises collection:new_member and collection:member_removed events.
      Intended to be wrapped by a developer-supplied ruleset
      which uses it as a module, and shields them from the
      complexities of the subscription ruleset.
    >>
    use module io.picolabs.subscription alias Subs
    provides members // uniquely identified by {"Id"}
    shares __testing, members
  }
  global {
    __testing = { "queries": [ { "name": "__testing" },
                               { "name": "members" } ],
                  "events": [ {"domain": "wrangler", "type": "deletion_imminent"} ] }
    members = function(){
      Subs:established("Tx_role",ent:Tx_role)
    }
    check_roles = function(){
      event:attr("Rx_role")==ent:Rx_role && event:attr("Tx_role")==ent:Tx_role
    }
  }
  rule initialize_role_names {
    select when wrangler ruleset_added where event:attr("rids") >< meta:rid
    if ent:Tx_role.isnull() && ent:Rx_role.isnull() then noop()
    fired {
      ent:Tx_role := "member";
      ent:Rx_role := "collection"
    }
  }
  rule establish_new_role_names {
    select when collection new_role_names
      Tx_role re#(.+)# Rx_role re#(.+)# setting(Tx_role,Rx_role)
    if ent:Tx_role && members().length() == 0 then noop()
    fired {
      ent:Tx_role := Tx_role;
      ent:Rx_role := Rx_role
    }
  }
  rule auto_accept {
    select when wrangler inbound_pending_subscription_added
    pre {
      acceptable = check_roles();
    }
    if acceptable then noop();
    fired {
      raise wrangler event "pending_subscription_approval"
        attributes event:attrs
    } else {
      raise wrangler event "inbound_rejection"
        attributes { "Rx": event:attr("Rx") }
    }
  }
  rule delete_member_subscriptions {
    select when wrangler deletion_imminent
    foreach members() setting(subs)
    fired {
      raise wrangler event "subscription_cancellation"
        attributes { "Rx": subs{"Rx"}, "Tx": subs{"Tx"} };
      raise wrangler event "ready_for_deletion" on final;
    }
  }
  rule new_member {
    select when wrangler subscription_added
    pre {
      pertinent = check_roles();
    }
    if pertinent then noop();
    fired {
      raise collection event "new_member" attributes event:attrs
    }
  }
  rule member_removed {
    select when wrangler subscription_removed
    pre {
      pertinent = check_roles();
    }
    if pertinent then noop();
    fired {
      raise collection event "member_removed" attributes event:attrs
    }
  }
}
