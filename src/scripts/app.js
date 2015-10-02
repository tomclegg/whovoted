m = require('mithril');

var db = m.prop({voters:[],votes:[],constituencies:[]});
m.request({method: "GET", url: "votes.json"}).then(db);

var grid = {};

grid.controller = function() {
}

grid.view = function(ctrl) {
    var voteClass = ['vote-no', 'vote-none', 'vote-yes'];
    return m('html', [
        m('body', [
            m('.vgrid', [
                db().votes.map(function(vote, voteID) {
                    return m('.row', vote['voters'].map(function(did, voterID) {
                        return m('div', {class: did ? voteClass[did.vote+1] : ""});
                    }));
                }),
            ]),
        ]),
    ]);
}

m.module(document.getElementById('body'), grid);
