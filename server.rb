require 'socket'

port = (ARGV[0] || 3000).to_i
server = TCPServer.new('0.0.0.0', port)
$stderr.puts "Swappo dev server running on http://localhost:#{port}"

MIME = {
  '.html' => 'text/html', '.css' => 'text/css', '.js' => 'application/javascript',
  '.json' => 'application/json', '.svg' => 'image/svg+xml', '.png' => 'image/png',
  '.jpg' => 'image/jpeg', '.ico' => 'image/x-icon', '.webp' => 'image/webp',
  '.woff2' => 'font/woff2', '.woff' => 'font/woff', '.xml' => 'application/xml',
  '.webmanifest' => 'application/manifest+json'
}

root = File.dirname(__FILE__)

loop do
  client = server.accept
  begin
    request = client.gets
    next unless request
    path = request.split(' ')[1]
    path = '/index.html' if path == '/'
    path = path.split('?').first

    file = File.join(root, path)
    file = File.join(file, 'index.html') if File.directory?(file)

    if File.exist?(file) && !File.directory?(file)
      ext = File.extname(file)
      mime = MIME[ext] || 'application/octet-stream'
      body = File.binread(file)
      client.print "HTTP/1.1 200 OK\r\nContent-Type: #{mime}\r\nContent-Length: #{body.bytesize}\r\nConnection: close\r\n\r\n"
      client.print body
    else
      body = "<h1>404 Not Found</h1><p>#{path}</p>"
      client.print "HTTP/1.1 404 Not Found\r\nContent-Type: text/html\r\nContent-Length: #{body.bytesize}\r\nConnection: close\r\n\r\n"
      client.print body
    end
  rescue => e
    $stderr.puts "Error: #{e.message}"
  ensure
    client.close rescue nil
  end
end
