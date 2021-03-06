// Collections
// -----------

// Super mega awesome interface for handling collections.
// This module exposes a method which takes a name. The
// name is used to create a new collection within mongo.

// Once the collection has been created, __create__, 
// __get__, __update__ and __remove__ action methods are
// created for operation on the collection.

// Filter functions can be attached to any of the above
// functions. The argument passed to the filter functions
// will be the doc

// A closure is returned with the actions in scope, it takes
// a socket and binds the appropriate set of events onto
// the socket. See [collection/api](api.html) for more details.

var Q = require('q')
  , mongo = require('../mongo')
  , api = require('./api')
  , _ = require('../util');

module.exports = function(settings) {
  var db, actions, name, filters;

  name = settings.name;
  filters = settings.filters;

  db = mongo(name);
  actions = {
  
    // # create 
    // `(item, done)`
    // Takes a schemaless item and a done callback function. 
    // Calls callback when the insert method finishes.
    create: function(item) {
      var deferred;
      deferred = Q.defer();

      // filter
      if(filters && filters.create instanceof Function) {
        item = filters.create(item);
      }

      db.insert(item, function(err) {
        // Callback must include item, so that users
        // know which item was added
        if(err) {
          deferred.reject(err)
        } else {
          deferred.resolve(item);
        }
      });

      return deferred.promise;
    },
    
    // # get
    // `(done)`
    // Takes one callback function, to be called
    // with the docs/errors returned from the find
    // method. Returns the entire collection,  __not__ 
    // just one object. Object selection should be
    // done client side.
    get: function(done) {
      var deferred;
      deferred = Q.defer();

      db.find(function(err, docs) {
        if(err) {
          deferred.reject(err);
        } else { 
          if(filters && filters.get instanceof Function) {
            docs = filters.get(docs);
          }    
          deferred.resolve(docs);
        }
      });

      return deferred.promise;
    }, 
  
    // # update
    // `(where, values, done)`
    // Takes a query object (where), an updated values
    // object (values) and a callback function. Very
    // much modelled on the MongoDb api.
    update: function(where, values) {
      var deferred;
      deferred = Q.defer();
      where = mongo.idify(where);

      db.update(where, { $set: values }, function(err) {
        var key, docs;
        if(err) {
          deferred.reject(err);
        } else {
          docs = values;
          // combine where with values
          // to recreate original object
          for(key in where) {
            docs[key] = where[key];
          }

          if(filters && filters.update instanceof Function) {
            docs = filters.update(docs);
          }

          // callback with ...
          deferred.resolve(docs);
        }
      });

      return deferred.promise;
    },
    
    // # remove 
    // `(item, done)`
    // Takes a query object (item) and a done callback function. 
    // The callback is called when the remove method has finished. 
    remove: function(doc) {
      var deferred;
      deferred = Q.defer();

      doc = mongo.idify(doc);

      if(filters && filters.remove instanceof Function) {
        doc = filters.remove(doc);
      }

      db.remove(doc, function(err) {
        if(err) {
          deferred.reject(err);
        } else {
          // callback with item so
          // clients know which to remove
          deferred.resolve(doc);
        }
      });

      return deferred.promise;
    }
  
  };

  return function(socket) {
    api(name, actions, socket);
    return actions;
  }  
};
