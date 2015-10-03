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
        session: m.prop({}),
        sessions: m.prop([]),
    };
    this.popVote = function(vote, voteID) {
        this.vm.popped(vote);
    };
    this.shouldShowVote = function(vote) {
        return (this.vm.session().parliament === vote.parliament &&
                this.vm.session().session === vote.session);
    };
    this.popped = this.vm.popped;
    this.setSession = function(s) {
        this.vm.session(s);
        this.vm.popped(null);
    };
    this.sessions = function() {
        if (this.db === db()) return this.vm.sessions();
        this.db = db();
        var saw = {}, s = [];
        this.db.votes.map(function(v) {
            if(!saw[''+v.parliament+' '+v.session]) {
                saw[''+v.parliament+' '+v.session] = 1;
                s.push({
                    parliament: v.parliament,
                    session: v.session,
                });
            }
        });
        s = s.sort(function(a,b) {
            if(a.parliament == b.parliament) return a.session-b.session;
            return a.parliament-b.parliament;
        });
        if(this.vm.session() === {} && s.length > 0)
            this.vm.session(s[s.length-1]);
        return this.vm.sessions(s);
    };
};

grid.view = function(ctrl) {
    return m('html', [
        m('body', [
            m('.ui.pointing.menu', ctrl.sessions().map(function(s) {
                return m('a.item[href=javascript:;]', {
                    class: ctrl.vm.session() === s ? 'active' : '',
                    onclick: ctrl.setSession.bind(ctrl, s),
                }, 'P'+s.parliament+' S'+s.session);
            })),
            !ctrl.popped() ? null : m('.pop.ui.message', {
                style: {
                    position: 'fixed',
                    top: '0px',
                    right: '0px',
                    width: '50%',
                    padding: '1em',
                },
            }, [
                m('.header', ctrl.popped().date),
                m('p', ctrl.popped().description),
            ]),
            m('.vgrid', {key:'grid'}, [
                db().votes.map(function(vote, voteID) {
                    if(!ctrl.shouldShowVote(vote)) return;
                    return m.component(gridrow, vote, voteID, ctrl.popVote.bind(ctrl));
                }),
            ]),
        ]),
    ]);
};

m.module(document.getElementById('body'), grid);
