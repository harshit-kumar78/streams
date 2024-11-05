const express = require("express");
const appStatus = require("express-status-monitor");
const fs = require("fs");
const zlib = require("zlib");
const { Transform, pipeline } = require("stream");

async function main() {
  const app = express();

  //middlewares
  app.use(appStatus());

  app.get("/", (req, res) => {
    createZipFileUsingStream();
  });
  //listening
  app.listen(5000, () => {
    console.log("application is running");
  });
}

main().catch(console.log);

/**
 * Asynchronously reads the contents of the file `input2.txt` and sends it as the HTTP response.
 * If the file is successfully read, its content is sent back to the client via
 * . If there is an error reading the file (e.g., file not found or permission
 * issues), the error message is sent in the response instead.
 *
 * @param {Object} req - The HTTP request object. It represents the incoming request from the client.
 * @param {Object} res - The HTTP response object. It is used to send the response to the client.
 *
 */
function readFromFileAsync(req, res) {
  fs.readFile("input2.txt", (err, data) => {
    if (err) {
      return res.end(err.message); // Send error message if file read fails
    }
    res.end(data); // Send the file content to the client if read is successful
  });
}

/**
 * Reads a file using a stream and sends the transformed (uppercase) data in the HTTP response.
 *
 * @param {Readable} req - The incoming HTTP request object. This is a readable stream representing
 *                          the client's request.
 * @param {Writable} res - The HTTP response object. This is a writable stream used to send the
 *                          transformed data back to the client.
 */
function readFileUsingStream(req, res) {
  //backpressure - it happens when the response cannot send the data nearly as fast it is receiving the data from the file.
  const stream = fs.createReadStream("input2.txt", {
    encoding: "utf8",
    highWaterMark: 4,
  });

  stream.on("data", (chunk) => {
    const transformedData = chunk.toUpperCase();
    console.log("chunk", chunk);
    res.write(transformedData);
  });

  stream.on("end", () => {
    res.end();
  });

  stream.on("error", (error) => {
    res.end(error.message);
  });
}

//  Creates a custom Transform stream that converts incoming chunks of data to uppercase.
// const transform = new Transform({
//   transform(chunk, encoding, callback) {
//     callback(null, chunk.toString().toUpperCase());
//   },
// });

/**
 *  This class extends the Node.js `Transform` stream and implements a custom transformation
 *  that modifies incoming data by converting it to uppercase.
 *
 * * @extends {Transform}
 */
class UppercaseTransform extends Transform {
  constructor(options) {
    super(options);
  }

  // The core transformation happens here
  _transform(chunk, encoding, callback) {
    // Convert the chunk to a string and then to uppercase
    const uppercased = chunk.toString().toUpperCase();

    // Push the transformed data to the next stream
    this.push(uppercased);

    // Call callback to indicate that the transformation is done
    callback();
  }
}

// Create an instance of the custom transform stream
const upperCaseStream = new UppercaseTransform();

/**
 * Streams the contents of the file `input.txt` to the HTTP response.
 *
 * This function reads a file using a readable stream (`fs.createReadStream`) and pipes the
 * data directly to the HTTP response stream (`res`). It allows for efficient, non-blocking
 * streaming of the file contents to the client, without fully loading the entire file into memory.
 *
 * @param {Object} req - The HTTP request object. This parameter is required for compatibility
 *                        w
 * @param {Object} res - The HTTP response object. It is a writable stream to which the file content
 *                        is piped, sending the file data to the client.
 *
 *
 */
function readingFileUsingStreamAndPipe(req, res) {
  const stream = fs.createReadStream("input2.txt", { encoding: "utf8" });
  //pipes are bad with memory leaks
  // stream.pipe(upperCaseStream).pipe(res);

  pipeline(stream, upperCaseStream, res, (error) => {
    console.log(error);
  });
}

/**
 * Reads data from a file, transforms it to uppercase, and writes the transformed data to a new file.
 * The function uses:
 * - A `readableStream` to read data from `input.txt`.
 * - A custom `upperCaseStream` (transform stream) to convert the data to uppercase.
 * - A `writableStream` to write the transformed data to `new_input.txt`.
 *
 * The `pipeline` ensures that the streams are correctly piped together and that errors are handled properly.
 *
 * @function
 * @name readingDataUsingStreamAndWritingToAfile
 * @returns {void} The function does not return any value. It performs streaming operations.
 */
function readingDataUsingStreamAndWritingToAfile() {
  const readableStream = fs.createReadStream("input.txt");
  const writableStream = fs.createWriteStream("new_input.txt");

  // Use pipeline to manage the flow of data through streams
  pipeline(readableStream, upperCaseStream, writableStream, (error) => {
    if (error) {
      console.error("Pipeline failed:", error);
    } else {
      console.log("Pipeline succeeded!");
    }
  });
}

/**
 * Compresses a file using GZIP and writes the compressed data to a new file.
 *
 * @function
 * @name createZipFileUsingStream
 * @returns {void} The function performs streaming operations without returning a value.
 */
function createZipFileUsingStream() {
  // Create a readable stream from a file
  const readableStream = fs.createReadStream("input2.txt");

  // Create a writable stream to write the compressed file
  const writableStream = fs.createWriteStream("sample.zip");

  // Create a GZIP stream to compress the data
  const gzipStream = zlib.createGzip();

  // Pipe the data from the readable stream to the GZIP stream, and then to the writable stream
  readableStream.pipe(gzipStream).pipe(writableStream);

  console.log("File has been compressed!");
}
