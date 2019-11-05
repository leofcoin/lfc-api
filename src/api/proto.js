export default `// disco message
message DiscoMessage {
  required bytes hash = 1;
  required bytes data = 2;
  optional string from = 3;
  optional string to = 4;
}`