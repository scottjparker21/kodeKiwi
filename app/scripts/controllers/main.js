'use strict';

/**
 * @ngdoc function
 * @name kodeKiwiApp.controller:MainCtrl
 * @description
 * # MainCtrl
 * Controller of the kodeKiwiApp
 */
angular.module('kodeKiwiApp')
  .controller('MainCtrl', function ($scope) {
    $scope.awesomeThings = [
      'HTML5 Boilerplate',
      'AngularJS',
      'Karma',
      'github-api'
    ];
  });
