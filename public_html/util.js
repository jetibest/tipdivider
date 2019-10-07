var util = {
    trim: function(str)
    {
        return (str || '').replace(/^\s+/gi, '').replace(/\s+$/gi, '');
    },
    merge: function(a, b)
    {
        if(!a)
        {
            return a = b;
        }
        if(b && typeof b === 'object')
        {
            for(var k in b)
            {
                if(Object.prototype.hasOwnProperty.call(b, k))
                {
                    if(a[k] && typeof a[k] === 'object')
                    {
                        util.merge(a[k], b[k]);
                    }
                    else
                    {
                        a[k] = b[k];
                    }
                }
            }
        }
        return a;
    },
    formatVariableString: function(str, vars)
    {
        return str.replace(/\$\{?([a-z_][a-z_0-9]+)\}?/gi, function($0, $1)
        {
            return $1 in vars ? vars[$1] : '';
        });
    },
    zeropad: function(str, n)
    {
        str = str +'';
        while(str.length < n)
        {
            str = '0' + str;
        }
        return str;
    },
    getHumanReadableTimestampFromEpochMS: function(epochMS)
    {
        var d = new Date(epochMS || Date.now());
        var months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
        
        return d.getDate() + ' ' + months[d.getMonth()] + ' ' + d.getFullYear() + ' ' + util.zeropad(d.getHours(), 2) + ':' + util.zeropad(d.getMinutes(), 2);
    },
    getDateHumanReadable: function()
    {
        return ''+ (new Date()).getDate();
    },
    getYearHumanReadable: function()
    {
        return ''+ (new Date()).getFullYear();
    },
    getMonthHumanReadable: (function()
    {
        var months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
        return function()
        {
            return months[(new Date()).getMonth()];
        };
    })(),
    forEach: function(arr, fnc)
    {
        arr = arr || [];
        var res = new Array(arr.length);
        for(var i=0;i<arr.length;++i)
        {
            var result = fnc(arr[i]);
            if(result !== null)
            {
                res[i] = result;
            }
        }
        return res;
    },
    catchError: function(err)
    {
        alert('Error: ' + JSON.stringify(err || 'Unknown Error'));
    },
    floatToMoney: function(f, currency)
    {
        return (currency ? currency.prefix || '' : '') + util.toDecimalString(f, 2) + (currency ? currency.suffix || '' : '');
    },
    toDecimalString: function(f, n, fixed)
    {
        if(Number.isNaN(f = parseFloat(f)))
        {
            return '';
        }
        if(!n)
        {
            return '' + Math.floor(f);
        }
        var prefix = '';
        if(f < 0)
        {
            f = -f;
            if(f !== 0)
            {
                prefix = '-';
            }
        }
        var str = prefix + Math.floor(f) + '.';
        var i = 0;
        while(++i < n)
        {
            // don't f *= 10 in loop, to prevent misrepresentation in binary system, i.e. try toDecimalString(123.456, 3), would return 123.455
            str += Math.floor((f * Math.pow(10, i))%10);
        }
        if(i === n)
        {
            // round last decimal
            str += Math.round((f * Math.pow(10, i))%10);
        }
        
        return (fixed ? str : str.replace(/(\.[1-9]*)[0]*$/gi, function($0, $1){return $1.length > 1 ? $1 : '';})).replace(/^-0/gi, '0');
    },
    getContextPath: function(path)
    {
        return './' + (path || '');
    },
    request: function(path, data)
    {
        return new Promise(function(resolve, reject)
        {
            var xmlhttp = new XMLHttpRequest();
            xmlhttp.onreadystatechange = function()
            {
                if(xmlhttp.readyState === 4)
                {
                    if(xmlhttp.status !== 200)
                    {
                        reject({error: 'Status-code is not OK: ' + xmlhttp.status});
                    }
                    try
                    {
                        resolve(JSON.parse(xmlhttp.responseText));
                    }
                    catch(err)
                    {
                        reject(err);
                    }
                }
            };
            xmlhttp.open('POST', util.getContextPath(path));
            xmlhttp.setRequestHeader('Content-Type', 'application/json;charset=UTF-8');
            xmlhttp.send(JSON.stringify(data));
        });
    },
    encrypt: async function(data, saltedPassphrase)
    {
        var passphraseBytes = util.hextobytes(saltedPassphrase); // multiple of power of 2
        
        //var key = await window.crypto.subtle.importKey('raw', passphraseBytes, 'AES-CBC', true, ['encrypt', 'decrypt']);
        // var dataBytes = util.strtobytes(data);
        var ivBytes = util.randombytes(passphraseBytes.length);
        var cipher = forge.cipher.createCipher('AES-CBC', forge.util.createBuffer(passphraseBytes));
        cipher.start({iv: forge.util.createBuffer(ivBytes)});
        cipher.update(forge.util.createBuffer(data));
        cipher.finish();
        return util.bytestohex(ivBytes) + cipher.output.toHex();
        //return util.bytestostr(ivBytes) + util.bytestostr(await window.crypto.subtle.encrypt({name: 'AES-CBC', iv: ivBytes}, key, dataBytes));
    },
    decrypt: async function(data, saltedPassphrase)
    {
        var passphraseBytes = util.hextobytes(saltedPassphrase); // multiple of power of 2
        var rawBytes = util.hextobytes(data);
        //var key = await window.crypto.subtle.importKey('raw', passphraseBytes, 'AES-CBC', true, ['encrypt', 'decrypt']);
        var dataBytes = rawBytes.slice(passphraseBytes.length);
        var ivBytes = rawBytes.slice(0, passphraseBytes.length);
        //return window.crypto.subtle.decrypt({name: 'AES-CBC', iv: ivBytes}, key, dataBytes);
        var decipher = forge.cipher.createDecipher('AES-CBC', forge.util.createBuffer(passphraseBytes));
        decipher.start({iv: forge.util.createBuffer(ivBytes)});
        decipher.update(forge.util.createBuffer(dataBytes));
        if(!decipher.finish())
        {
            return null;
        }
        return decipher.output.data;
    },
    hextobytes: (function()
    {
        var chars = '0123456789abcdef'.split('');
        var map = {};
        for(var i=0;i<chars.length;++i){map[chars[i]] = i;}
        return function(hex)
        {
            if(hex.length % 2)
            {
                hex = '0' + hex;
            }
            hex = hex.split('');
            var arr = new Uint8Array(hex.length/2);
            var j = 0;
            for(var i=0;i<hex.length;++i)
            {
                arr[j++] = (map[hex[i]] || 0) * 16 + (map[hex[++i]] || 0);
            }
            return arr;
        };
    })(),
    bytestohex: (function()
    {
        var chars = '0123456789abcdef'.split('');
        return function(bytes)
        {
            var hexarr = new Array(bytes.length*2);
            var j = 0;
            for(var i=0;i<bytes.length;++i)
            {
                hexarr[j++] = chars[Math.floor(bytes[i]/16)];
                hexarr[j++] = chars[bytes[i]%16];
            }
            return hexarr.join('');
        };
    })(),
    bytestostr: (function()
    {
        var dec = new TextDecoder();
        return function(str){return dec.decode(str);};
    })(),
    strtobytes: (function()
    {
        var enc = new TextEncoder();
        return function(bytes){return enc.encode(bytes);};
    })(),
    randombytes: (function()
    {
        if(window.crypto && window.crypto.getRandomValues)
        {
            return function(n)
            {
                var arr = new Uint8Array(n);
                window.crypto.getRandomValues(arr);
                return arr;
            };
        }
        if(forge)
        {
            return function(n){return util.strtobytes(forge.random.getBytesSync(n));};
        }
        return function(n)
        {
            var arr = new Uint8Array(n);
            while(--n >= 0)
            {
                arr[n] = Math.floor(Math.random() * 256);
            }
            return arr;
        };
    })(),
    gencryptokey: function(n)
    {
        return util.randombytes(n);
        //return new Uint8Array(await window.crypto.subtle.exportKey('raw', await window.crypto.subtle.generateKey({name: 'AES-CBC', length: 8 * n}, true, ['encrypt', 'decrypt'])));
    },
    key: async function(n)
    {
        // get key from hash, if not exists, generate randomly a new one
        // the first half of the key is used for the ID, the second half for the passphrase for encryption
        if(window.location.hash && window.location.hash.length >= 2)
        {
            return window.location.hash.replace(/^#[!]?/gi, '');
        }
        // first generate the ID
        var genhash = util.bytestohex(util.strtobytes(Math.floor(Date.now()/1000)+'')) + util.bytestohex(util.randombytes(16));
        // then the passphrase, which is 32 bytes
        genhash += util.bytestohex(await util.gencryptokey(n || 16));
        if(window.history && window.history.replaceState)
        {
            window.history.replaceState(null, null, '#' + genhash);
        }
        else
        {
            window.location.hash = '#!' + genhash;
        }
        ui.trigger('url-update');
        return genhash;
    },
    id: async function(n)
    {
        // get first half of the key (2*n because i.e. 16 bytes is 32 hex chars)
        n = n || 16;
        var key = await util.key(n);
        return key.substring(0, key.length - 2*n);
    },
    passphrase: async function(n)
    {
        // get second half of the key (2*n because i.e. 16 bytes is 32 hex chars)
        n = n || 16;
        var key = await util.key(n);
        return key.substring(key.length - 2*n);
    }
};
