#!/usr/bin/env ruby

require 'nokogiri'
require 'ostruct'
require 'json'

@voterNameToID = {}
@constituencyNameToID = {}
@out = {
  voters: [],
  votes: [],
  constituencies: [],
}

def doSessions
  ARGV.collect do |infile|
    session = Nokogiri::XML(File.open(infile))
    session.css('Vote')
  end.flatten.sort do |a, b|
    a.attributes["date"].to_s <=> b.attributes["date"].to_s
  end.each do |vote|
    voteID = @out[:votes].length
    @out[:votes] << {
      date: vote.attributes["date"],
      description: vote.css('Description').text,
      voters: [],
    }
    attr = vote.attributes
    voteLabel = "#{attr["parliament"]}-#{attr["session"]}-#{attr["number"]}"
    cacheFile = "data/vote-#{voteLabel}.xml"
    Nokogiri::XML(File.open cacheFile).xpath('//Vote').each do |vote|
      # (expect only one)
      vote.css('Participant').each do |participant|
        noteVote voteID, participant
      end
    end
  end
end

def noteVote voteID, participant
  cID = @constituencyNameToID[participant.css('Constituency').text] ||=
    begin
      @out[:constituencies] << participant.css('Constituency').text
      @out[:constituencies].length - 1
    end
  voterName = participant.css('Name').text
  voterID = @voterNameToID[voterName] ||=
    begin
      @out[:voters] << {name: voterName, nVotes: 0}
      @out[:voters].length - 1
    end
  yea = participant.css('RecordedVote Yea').text.to_i
  nay = participant.css('RecordedVote Nay').text.to_i
  vote =
    if yea > 0
      1
    elsif nay > 0
      -1
    else
      0
    end
  @out[:voters][voterID] ||= {name: voterName, nVotes: 0}
  @out[:voters][voterID][:nVotes] += 1
  @out[:votes][voteID][:voters][voterID] = {
    constituency: cID,
    party: participant.css('Party').text,
    vote: vote,
  }
end

doSessions
puts JSON.dump @out
