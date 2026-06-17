import Foundation

class SSEParser {
    private var buffer = ""
    private var eventType = "message"
    private var eventId: String? = nil
    private var dataLines: [String] = []
    
    // Parses incoming raw data chunk and returns complete events
    func parse(chunk: String) -> [(type: String, id: String, data: String)] {
        buffer += chunk
        var events: [(type: String, id: String, data: String)] = []
        
        while let eventRange = buffer.range(of: "\n\n") ?? buffer.range(of: "\r\n\r\n") {
            let eventBlock = String(buffer[..<eventRange.lowerBound])
            buffer.removeSubrange(..<eventRange.upperBound)
            
            if let parsedEvent = parseEventBlock(eventBlock) {
                events.append(parsedEvent)
            }
        }
        
        return events
    }
    
    private func parseEventBlock(_ block: String) -> (type: String, id: String, data: String)? {
        let lines = block.components(separatedBy: .newlines)
        
        eventType = "message"
        // Intentionally keep eventId from previous blocks if not provided in this one
        dataLines.removeAll()
        
        for line in lines {
            if line.hasPrefix(":") {
                continue // Comment line
            }
            
            if let colonIndex = line.firstIndex(of: ":") {
                let field = String(line[..<colonIndex])
                let valueStartIndex = line.index(after: colonIndex)
                var value = String(line[valueStartIndex...])
                
                if value.hasPrefix(" ") {
                    value.removeFirst()
                }
                
                switch field {
                case "event":
                    eventType = value
                case "id":
                    eventId = value
                case "data":
                    dataLines.append(value)
                case "retry":
                    // Handled by JS wrapper if needed
                    break
                default:
                    break
                }
            } else if !line.isEmpty {
                // Field with no value (e.g., "data")
                let field = line
                if field == "data" {
                    dataLines.append("")
                }
            }
        }
        
        if dataLines.isEmpty {
            return nil
        }
        
        let data = dataLines.joined(separator: "\n")
        return (type: eventType, id: eventId ?? "", data: data)
    }
}
