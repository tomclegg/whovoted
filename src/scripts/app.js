var m = require('mithril');
var _ = require('lodash');

var app = {state: {pageY: 0, pageHeight: window.innerHeight}};

var db = m.prop({voters:[],votes:[],constituencies:[]});
m.request({method: "GET", url: "votes.json"}).then(db);

var gridrow = {};

gridrow.controller = function(vote, voteID, gridCtrl) {
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
    this.isPopped = function() {
        return gridCtrl.popped() == this.vm.vote;
    };
    this.popThis = gridCtrl.popVote.bind(gridCtrl, vote, voteID);
    this.vm = {
        vote: vote,
        voteID: voteID,
        assenting: a,
        dissenting: d,
        dissentingTot: dTot,
    };
};

gridrow.view = function(ctrl) {
    var nextX = (200-ctrl.vm.dissentingTot)*2;
    return m('.vgrow', {
        class: ctrl.isPopped() ? 'active' : '',
        key: ctrl.vm.voteID,
        onclick: ctrl.popThis,
    }, [
        ctrl.vm.dissenting.map(function(v) {
            var x = nextX, w = v.n*2;
            nextX += w;
            return m('div', {
                class: 'dissenting party '+v.p,
                style: {
                    left: ''+x+'px',
                    width: ''+w+'px',
                },
            });
        }),
        ctrl.vm.assenting.map(function(v) {
            var x = nextX, w = v.n*2;
            nextX += w;
            return m('div', {
                class: 'party '+v.p,
                style: {
                    left: ''+x+'px',
                    width: ''+w+'px',
                },
            });
        }),
    ]);
};

var grid = {};

grid.controller = function() {
    this.vm = {
        offsetTop: 0,
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
            var k = ''+v.parliament+' '+v.session;
            if(!saw[k]) {
                saw[k] = {
                    parliament: v.parliament,
                    session: v.session,
                    dateFirst: v.date,
                    dateLast: v.date,
                };
                s.push(saw[k]);
            } else if(saw[k].dateFirst > v.date) {
                saw[k].dateFirst = v.date;
            } else if(saw[k].dateLast < v.date) {
                saw[k].dateLast = v.date;
            }
        });
        s = s.sort(function(a,b) {
            if(a.parliament == b.parliament) return a.session-b.session;
            return a.parliament-b.parliament;
        });
        if(!this.vm.session()['parliament'] && s.length > 0)
            this.vm.session(s[s.length-1]);
        return this.vm.sessions(s);
    };
};

grid.view = function(ctrl) {
    return m('html', [
        m('body', [
            grid.viewMenu(ctrl),
            grid.viewGrid(ctrl),
            grid.viewPop(ctrl),
        ]),
    ]);
}

grid.viewMenu = function(ctrl) {
    return [
        m('.ui.pointing.menu', ctrl.sessions().map(function(s) {
            return m('a.item[href=javascript:;]', {
                class: ctrl.vm.session() === s ? 'active' : '',
                onclick: ctrl.setSession.bind(ctrl, s),
            }, [
                m('h4', [
                    'P', s.parliament, ' S', s.session,
                ]),
            ]);
        })),
        !ctrl.vm.session()['parliament'] ? null : m('.ui.grid.container', m('.ui.grid.row', m('p', [
            m('h4', [
                'Parliament ', ctrl.vm.session().parliament,
                ', Session ', ctrl.vm.session().session,
            ]),
            m('p', [
                'Party votes from ',
                ctrl.vm.session().dateFirst,
                ' to ',
                ctrl.vm.session().dateLast,
            ]),
        ]))),
    ];
}

grid.viewPop = function(ctrl) {
    var v = ctrl.popped();
    if(!v) return null;

    var loyalCount = 0, rogues = [], partyVote = {};
    ['with', 'against'].map(function(withagainst) {
        v[withagainst+'Parties'].split('').map(function(p) {
            if(p === ' ' || p === 'I') return;
            if(!partyVote[p]) partyVote[p] = {'with': 0, 'against': 0};
            partyVote[p][withagainst]++;
        });
    });
    Object.keys(partyVote).map(function(p) {
        if(partyVote[p]['with'] >= partyVote[p]['against'])
            partyVote[p] = 'with';
        else
            partyVote[p] = 'against';
    });
    ['with', 'against'].map(function(withagainst) {
        v[withagainst+'Parties'].split('').map(function(p, i) {
            if(p === ' ' | p === 'I') return;
            if(partyVote[p] === withagainst) return loyalCount++;
            var rogue = db().voters[i];
            rogues.push(m('.item', [
                m('span', {style:{'float':'left',width:'2em'}}, p),
                rogue.name,
            ]));
        });
    });

    return m('.pop.ui.message', {
        style: {
            position: 'fixed',
            top: '10%',
            right: '2em',
            width: '30%',
            height: '80%',
            padding: '1em',
            overflowY: 'scroll',
        },
    }, [
        m('.header', v.date),
        m('p', {
            style: {
                height: '5em',
                overflow: 'hidden',
            },
        }, v.description),
        m('.ui.divider'),
        m('p', 'MPs who voted with their party: ', loyalCount),
        m('.header', 'MPs who voted against their party: ', rogues.length),
        m('.ui.list', rogues),
    ]);
}

grid.viewGrid = function(ctrl) {
    var y = 0;
    return m('.vgrid', {
        config: function(el) { ctrl.vm.offsetTop = el.offsetTop },
        key:'grid',
    }, [
        db().votes.map(function(vote, voteID) {
            if(!ctrl.shouldShowVote(vote)) return;
            y++;
            if((y + 5) * 8 + ctrl.vm.offsetTop < app.state.pageY ||
               (y - 5) * 8 + ctrl.vm.offsetTop > app.state.pageY + app.state.pageHeight)
                return m('.vgrow');
            else
                return m.component(gridrow, vote, voteID, ctrl);
        }),
    ]);
};

document.defaultView.addEventListener("scroll resize", checkScroll);
document.defaultView.setInterval(checkScroll, 100);
function checkScroll() {
    if (app.state.pageY !== document.defaultView.scrollY ||
        app.state.pageHeight !== document.defaultView.innerHeight) {
        app.state.pageY = document.defaultView.scrollY;
        app.state.pageHeight = document.defaultView.innerHeight;
        m.redraw();
    }
}

m.module(document.body, grid);
