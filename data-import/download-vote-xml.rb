#!/usr/bin/env ruby

require 'nokogiri'

ARGV.each do |infile|
  session = Nokogiri::XML(File.open(infile))
  session.xpath('//Vote').each do |vote|
    attr = vote.attributes
    cacheFile = "data/vote-#{attr["parliament"]}-#{attr["session"]}-#{attr["number"]}.xml"
    next if File.exists? cacheFile

    src = "http://www.parl.gc.ca/HouseChamberBusiness/Chambervotedetail.aspx?Language=E&Mode=1&Parl=#{attr["parliament"]}&Ses=#{attr["session"]}&FltrParl=#{attr["parliament"]}&FltrSes=#{attr["session"]}&vote=#{attr["number"]}&xml=True"
    STDERR.puts "GET #{src} -> #{cacheFile}"
    voteXML = Net::HTTP.get URI src
    File.open(cacheFile, 'w') do |f|
      f.write voteXML rescue File.unlink cacheFile
    end
  end
end
