#!/bin/bash

sha384hash()
{
	echo -n "$1: sha384-"
	cat "$1" | openssl dgst -sha384 -binary | openssl base64 -A && echo
}

sha384hash public_html/app.js
sha384hash public_html/controller.js
sha384hash public_html/forge.min.js
sha384hash public_html/html.js
sha384hash public_html/ui.js
sha384hash public_html/util.js
