var m = require('mithril');

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
        return gridCtrl.vm.popped() == this.vm.vote;
    };
    this.popThis = gridCtrl.popVote.bind(gridCtrl, vote);
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
    this.setSession = function(s) {
        this.vm.session(s);
        this.popVote(null);
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
    return [
        m('.ui.masthead.vertical.segment', m('.ui.container', [
            m('h1.ui.header', 'Who voted?'),
        ])),
        m('.ui.container', m('.row', [
            m('.ui.four.column.middle.aligned.grid', {style:{position:'relative'}}, [
                m('.column', 'This is a visual representation of voting results from the House of Commons.'),
                m('.ui.vertical.divider', m('i.pointing.right.icon')),
                m('.column', 'It illustrates the difference between how minority and majority governments work in a multi-party system.'),
                m('.ui.vertical.divider', m('i.pointing.right.icon')),
                m('.column', m.trust('With a minority government like P39, at least two parties have to agree in order to change a law. With a majority government like P41, the ruling party&rsquo;s &ldquo;party line&rdquo; is usually the only determining factor.')),
                m('.ui.vertical.divider', m('i.pointing.right.icon')),
                m('.column', m.trust('This display also helps us see how often MPs&rsquo; votes depart from their respective party lines.')),
            ]),
        ])),
        grid.viewMenu(ctrl),
        grid.viewGrid(ctrl),
        m('.footer', [
            m('.ui.clearing.divider'),
            m('.ui.container', m('.row', m('p', [
                m('i.database.icon'),
                m('a[href=http://www.parl.gc.ca/LegisInfo/Home.aspx?language=E&ParliamentSession=41-2]', 'parl.gc.ca'),
                m('i.fork.icon'),
                m('a[href=https://github.com/tomclegg/whovoted]', 'github.com/tomclegg/whovoted'),
            ]))),
        ]),
        ctrl.vm.popped() ? m.component(pop, ctrl.vm.popped()) : null,
    ];
}

grid.viewMenu = function(ctrl) {
    return [
        m('.ui.pointing.borderless.menu', ctrl.sessions().map(function(s) {
            return m('a.item[href=javascript:;]', {
                class: ctrl.vm.session() === s ? 'active' : '',
                onclick: ctrl.setSession.bind(ctrl, s),
            }, [
                m('h4', [
                    'P', s.parliament, '.', s.session,
                ]),
            ]);
        }), [
            m('.item.grid-legend', [
                m('i.arrow.left.icon'),
                'Click to choose a parliament session',
            ]),
        ]),
        !ctrl.vm.session()['parliament'] ? null : [
            m('p.grid-legend', [
                '(',
                ctrl.vm.session().dateFirst,
                ' to ',
                ctrl.vm.session().dateLast,
                ')',
                m('br'),
                'Click to show who voted',
                m('br'),
                m('i.arrow.down.icon'),
            ]),
        ],
    ];
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

var pop = {};

pop.controller = function update(vote) {
    var loyalCount = 0, abstained = [], rogues = [], sideCount = {'with': 0, 'against': 0}, partyCount = {}, partyVote = {}, sideLabel = {};

    if(this.vm && this.vm.vote == vote)
        return;

    ['with', 'against'].map(function(withagainst) {
        vote[withagainst+'Parties'].split('').map(function(p, i) {
            var v = vote[withagainst+'Votes'][i];
            if(v === '-' || v === ' ') return;
            if(!partyCount[p]) partyCount[p] = {'with': 0, 'against': 0};
            partyCount[p][withagainst]++;
            sideCount[withagainst]++;
            if(!sideLabel[withagainst]) {
                sideLabel[withagainst] = v === 'y' ? 'Yea' : 'Nay';
                sideLabel[withagainst === 'with' ? 'against' : 'with'] = v === 'y' ? 'Nay' : 'Yea';
            }
        });
    });
    Object.keys(partyCount).map(function(p) {
        if(partyCount[p]['with'] >= partyCount[p]['against'])
            partyVote[p] = 'with';
        else
            partyVote[p] = 'against';
    });
    ['with', 'against'].map(function(withagainst) {
        vote[withagainst+'Parties'].split('').map(function(p, i) {
            var v = vote[withagainst+'Votes'][i];
            if(partyVote[p] === withagainst) return loyalCount++;
            var mp = db().voters[i];
            if(v === '-')
                return abstained.push({party: p, name: mp.name});
            if(v !== ' ' && p !== 'I')
                rogues.push({party: p, name: mp.name});
        });
    });

    this.vm = {
        loyalCount: loyalCount,
        abstained: abstained,
        rogues: rogues,
        partyCount: partyCount,
        sideCount: sideCount,
        sideLabel: sideLabel,
        vote: vote,
    };
    this.update = update.bind(this);
}

pop.viewMP = function viewMP(r) {
    return m('.item', [
        m('span.mppartylabel', r.party),
        m('.mppartypixel.party', {class:r.party}),
        r.name,
    ]);
}

pop.view = function(ctrl, vote) {
    ctrl.update(vote);
    return m('#pop.ui.message', [
        m('.header', ctrl.vm.vote.date),
        m('p', {
            style: {
                height: '5em',
                overflow: 'hidden',
            },
        }, ctrl.vm.vote.description),
        m('.ui.divider'),
        m('table.votebyparty', [
            m('thead', [
                m('tr', m('th'), ['against', 'with'].map(function(side) {
                    return m('th.right', ctrl.vm.sideLabel[side]);
                })),
            ]),
            m('tbody', Object.keys(ctrl.vm.partyCount).sort().map(function(p) {
                return m('tr', [
                    m('td', [
                        m('span.mppartylabel', p),
                        m('.mppartypixel.party', {class: p}),
                    ]),
                    ['against', 'with'].map(function(side) {
                        return m('td.right', ctrl.vm.partyCount[p][side] || '-');
                    }),
                ]);
            })),
            m('tfoot', m('tr', m('td'), ['against', 'with'].map(function(side) {
                return m('td.right', ''+(0+ctrl.vm.sideCount[side]));
            }))),
        ]),
        m('p', 'MPs who voted with their party: ', ctrl.vm.loyalCount),
        m('.header', 'MPs who voted against their party: ', ctrl.vm.rogues.length),
        m('.ui.list', ctrl.vm.rogues.map(pop.viewMP)),
        m('p', 'MPs who abstained: ', ctrl.vm.abstained.length),
        m('.ui.list', ctrl.vm.abstained.map(pop.viewMP)),
    ]);
}

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
