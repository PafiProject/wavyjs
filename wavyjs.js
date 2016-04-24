// License information: The MIT License
//
// Copyright (c) 2016 Chris Schalick All Rights Reserved.
//
// Permission is hereby granted, free of charge, to any person obtaining a copy of 
// this software and associated documentation files (the "Software"), to deal in 
// the Software without restriction, including without limitation the rights to use, 
// copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the 
// Software, and to permit persons to whom the Software is furnished to do so, 
// subject to the following conditions:
//
//   The above copyright notice and this permission notice shall be included in all 
//   copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, 
// INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A 
// PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT 
// HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION 
// OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE 
// SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.

function wavyjs(){
  this.me = wavyjs.count++;
  this.raw = null;
};

// instance counter
wavyjs.count = 0;

// This method allocates space for waveform data in the 
// object and sets up the wav file headers. The headers
// describe the size and content of the file in the 1st 
// 44 bytes. Wav files are split into "chunks" that have a 
// name, size and data. This only uses one RIFF, fmt and 
// data chunk. The fmt and data chunk are contained in 
// children of the RIFF chunk. All numeric and data values
// are stored little endian (LSB first) because this is 
// a Windows format.
wavyjs.prototype.make = function(channels, smprate, bits, samples){
  var total    = 44 + samples * channels * bits / 8;
  var bytes    = bits / 8 * channels;
  var byterate = smprate * bits / 8;
  this.raw     = new ArrayBuffer(total);
  var snd      = new DataView(this.raw);
                                       // content                endian-ness
  snd.setInt32(0,  0x52494646, false); // "RIFF"                 big
  snd.setInt32(4,  total - 8, true);   // file size - 8 (bytes)  little
  snd.setInt32(8,  0x57415645, false); // "WAVE"                 big
  snd.setInt32(12, 0x666d7420, false); // "fmt "                 big
  snd.setInt16(16, 16, true);          // header size            little
  snd.setInt16(20, 1, true);           // format tag 1 = PCM     little
  snd.setInt16(22, channels, true);    // channels 1 = mono      little
  snd.setInt32(24, smprate, true);     // sample rate            little
  snd.setInt32(28, byterate, true);    // bytes/sec              little
  snd.setInt16(32, bytes, true);       // bytes/sample           little
  snd.setInt16(34, bits, true);        // bits/sample            little
  snd.setInt32(36, 0x64617461, false); // "data"                 big
  snd.setInt32(40, total - 44, true);  // data length            little
};

// getters for header fields
wavyjs.prototype.len = function(){
  var snd = new DataView(this.raw);
  var len = snd.getInt32(40, true);
  return len; 
};

wavyjs.prototype.channels = function(){
  var snd = new DataView(this.raw);
  var chs = snd.getInt16(22, true);
  return chs; 
};

wavyjs.prototype.rate = function(){
  var snd = new DataView(this.raw);
  var rat = snd.getInt32(24, true);
  return rat; 
};

wavyjs.prototype.bits = function(){
  var snd = new DataView(this.raw);
  var num = snd.getInt16(34, true);
  return num; 
};

// waveform setters / getters
wavyjs.prototype.set_data = function(idx, right, data){
  var numbits = this.bits(this.raw);
  var chans   = this.channels(this.raw);
  var snd     = new DataView(this.raw);
  var offset  = (chans * numbits / 8) * idx + 44 + right * numbits / 8;
  if((offset >= this.raw.byteLength) ||
     (offset == undefined))
    return;
  if(numbits == 8)
    snd.setInt8(offset, data);
  else if(numbits == 16)
    snd.setInt16(offset, data, true);
  else if(numbits == 32)
    snd.setInt32(offset, data, true);
};

wavyjs.prototype.get_data = function(idx, right){
  var numbits = this.bits(this.raw);
  var chans   = this.chans(this.raw);
  var snd     = new DataView(this.raw);
  var offset  = (chans * numbits / 8) * idx + 44 + right * numbits / 8;
  var data;
  if(numbits == 8)
    data = snd.getInt8(offset);
  else if(numbits == 16)
    data = snd.getInt16(offset, true);
  else if(numbits == 32)
    data = snd.setInt32(offset, true);

  return data;
};

wavyjs.prototype.audio = function(){
  return this.raw;
};

// file i/o routines
wavyjs.prototype.save = function(name) {
  var a = document.createElement("a");
  document.body.appendChild(a);
  a.style = "display: none";
  var blob = new Blob([this.raw], {type: "octet/stream"});
  var url = window.URL.createObjectURL(blob);
  a.href = url;
  a.download = name;
  a.click();
  window.URL.revokeObjectURL(url);
};

wavyjs.prototype.load_url = function(url, ok_callb, err_callb) {
  var request = new XMLHttpRequest();
  request.open('GET', url, true);
  request.responseType = 'arraybuffer';

  request.onload = function() {
    if(typeof request.response.byteLength == "undefined")
      return;

    context.decodeAudioData(request.response).then(
      function(buffer){ok_callb(buffer);}, 
      function(e){err_callb(e)});
  }
  request.send();
}

wavyjs.prototype.load_file = function(selected, ok_callb, err_callb) {
  if(window.File && window.FileReader && window.FileList && window.Blob){
    var files = selected.files;
    for(var x = 0; x < files.length; x++){
      var size = files[x].size;
      var reader = new FileReader;
      var wavptr = this;
      reader.onload = (function(afile){
        return function(e){
          wavptr.raw = e.target.result;
          ok_callb();
	};
      })(files[x]);
      reader.readAsArrayBuffer(files[x]);
    }
  } else {
    err_callb("File reader not supported by your browser.");
  }
}

