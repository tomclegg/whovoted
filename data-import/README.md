Setup
=====

```
sudo apt-get install ruby ruby-dev bundler libxml2-dev zlib1g-dev
```

```
bundle install --path vendor/bundle  
```

Download
========

```
mkdir data
```

Download session-*.xml from `http://www.parl.gc.ca/HouseChamberBusiness/ChamberVoteList.aspx?Language=E&Mode=1&Parl=40&Ses=2`

```
bundle exec download-vote-xml.rb data/session-*.xml
```
