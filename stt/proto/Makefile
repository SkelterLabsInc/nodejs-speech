PROTOC = ../node_modules/.bin/grpc_tools_node_protoc

all:
    $(PROTOC) --js_out=import_style=commonjs,binary:../ \
    --grpc_out=grpc-js:../ \
    --proto_path . \
    ./google/*/*.proto \
    ./google/*/*/*.proto
