var m = require('mithril');
var _ = require('lodash');

var db = m.prop({voters:[],votes:[],constituencies:[]});
m.request({method: "GET", url: "votes.json"}).then(db);

var gridrow = {};

gridrow.controller = function(vote, voteID, popVote) {
    var a=[], d=[], dTot=0;
    vote.withParties.split('').sort().map(function(p, i) {
        if(p === ' ' || vote.withVotes[i] === '-') return;
        if(a.length === 0 || a[a.length-1].p !== p) {
            a.push({p:p, n:0});
        }
        a[a.length-1].n++;
    });
    vote.againstParties.split('').sort().map(function(p, i) {
        if(p == ' ' || vote.againstVotes[i] == '-') return;
        if(d.length === 0 || d[d.length-1].p !== p) {
            d.push({p:p, n:0});
        }
        d[d.length-1].n++;
        dTot++;
    });
    this.popVote = popVote;
    this.vm = {
        vote: vote,
        voteID: voteID,
        assenting: a,
        dissenting: d,
        dissentingTot: dTot,
    };
};

gridrow.view = function(ctrl) {
    return m('.row', {
        key: ctrl.vm.voteID,
        onmouseover: ctrl.popVote.bind(ctrl, ctrl.vm.vote, ctrl.vm.voteID),
    }, [
        m('div', {
            style: {
                width: ''+((200-ctrl.vm.dissentingTot)*2)+'px',
            }
        }),
        ctrl.vm.dissenting.map(function(v) {
            return m('div', {
                class: 'dissenting party '+v.p,
                style: {
                    width: ''+(v.n*2)+'px',
                },
            });
        }),
        ctrl.vm.assenting.map(function(v) {
            return m('div', {
                class: 'party '+v.p,
                style: {
                    width: ''+(v.n*2)+'px',
                },
            });
        }),
    ]);
};

var grid = {};

grid.controller = function() {
    this.vm = {
        popped: m.prop(),
    };
    this.popVote = function(vote, voteID) {
        this.vm.popped(vote);
    };
    this.popped = this.vm.popped;
};

grid.view = function(ctrl) {
    return m('html', [
        m('body', [
            m('.pop', {
                style: {
                    position: 'absolute',
                    right: '0px',
                    width: '50%',
                    padding: '1em',
                    background: '#fff',
                },
            }, !ctrl.popped() ? [] : [
                m('span', ctrl.popped().date),
                m('br'),
                m('span', ctrl.popped().description),
            ]),
            m('.vgrid', [
                db().votes.map(function(vote, voteID) {
                    return m.component(gridrow, vote, voteID, ctrl.popVote.bind(ctrl));
                }),
            ]),
        ]),
    ]);
};

m.module(document.getElementById('body'), grid);
