/*global Stats:true*/
angular
    .module('game.threeWorld', [
        'ces',
        'three',
        'engine.entity-builder'
    ])
    .factory('ThreeWorld', [
        'World',
        'THREE',
        '$http',
        '$q',
        'EntityBuilder',
        '$log',
        function(World, THREE, $http, $q, EntityBuilder, $log) {
            'use strict';

            // takes the normal CES world and fuses it with THREE
            var ThreeWorld = World.extend({
                init: function(sceneName) {
                    this._super();

                    this._timing = {};

                    // can check on this in loops
                    this._isLoading = {};

                    if (Meteor.isClient) {
                        this.renderer = new THREE.WebGLRenderer();
                        this.stats = new Stats();
                    } else {
                        this.renderer = null;
                        this.stats = null;
                    }

                    this.scene = new THREE.Scene();
                    this.scene.name = sceneName;
                },
                addEntity: function(entity) {
                    this._super(entity);

                    // only add top level ents
                    if (!entity.parent) {
                        this.scene.add(entity);
                    }
                },
                removeEntity: function(entity) {
                    this._super(entity);

                    this.scene.remove(entity);
                },
                traverse: function(fn) {
                    this.scene.traverse(fn);
                },
                load: function(sceneName) {
                    var world = this,
                        loadTask;

                    // load any scene, or default to our own
                    sceneName = sceneName || world.scene.name;

                    world._isLoading[sceneName] = true;

                    if (Meteor.isClient) {
                        loadTask = $http.get('scene/' + sceneName + '/ib-world.json')
                            .then(function(response) {
                                return response.data;
                            }, $q.reject);
                    } else {
                        loadTask = (function() {
                            var deferred = $q.defer(),
                                path = Meteor.npmRequire('path'),
                                fs = Meteor.npmRequire('fs'),
                                // TODO: move these filepaths to SERVER ONLY constants
                                meteorBuildPath = path.resolve('.') + '/',
                                meteorBuildPublicPath = meteorBuildPath + '../web.browser/app/',
                                scenePath = meteorBuildPublicPath + 'scene/',
                                filePath = scenePath + sceneName + '/ib-world.json';

                            fs.readFile(filePath, 'utf8', Meteor.bindEnvironment(function(err, data) {
                                if (err) {
                                    if (err.code !== 'ENOENT') {
                                        deferred.reject(err);
                                    }
                                } else {
                                    deferred.resolve(data);
                                }
                            }));

                            return deferred.promise;
                        })();
                    }

                    return loadTask
                        .then(function(json) {
                            var entityTree = EntityBuilder.load(json);
                            world.addEntity(entityTree);
                            world._isLoading[sceneName] = false;
                        }, function(err) {
                            $log.error('Error loading ', sceneName, err);
                        });
                }
            });

            return ThreeWorld;
        }
    ]);