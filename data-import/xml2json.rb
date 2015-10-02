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
      withVotes: "",
      withParties: "",
      againstVotes: "",
      againstParties: "",
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
    v = @out[:votes][-1]
    if v[:withVotes].count('y') < v[:againstVotes].count('n')
      v[:withVotes], v[:withParties], v[:againstVotes], v[:againstParties] =
        v[:againstVotes], v[:againstParties], v[:withVotes], v[:withParties]
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
  voteChr =
    if yea > 0
      'y'
    elsif nay > 0
      'n'
    else
      '-'
    end
  @out[:voters][voterID] ||= {name: voterName, nVotes: 0}
  @out[:voters][voterID][:nVotes] += 1
  v = @out[:votes][voteID]
  wowv = nay > 0 ? :againstVotes : :withVotes
  wowp = nay > 0 ? :againstParties : :withParties
  while v[wowv].length < voterID
    v[wowv] += " "
    v[wowp] += " "
  end
  v[wowv][voterID] = voteChr
  v[wowp][voterID] = participant.css('Party').text[0]
  # TODO: save constituency cID
end

doSessions
puts JSON.dump @out
