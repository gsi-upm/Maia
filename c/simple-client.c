/*
 * libwebsockets-test-echo - libwebsockets echo test implementation
 *
 * This implements both the client and server sides.  It defaults to
 * serving, use --client <remote address> to connect as client.
 *
 * Copyright (C) 2010-2013 Andy Green <andy@warmcat.com>
 *
 *  This library is free software; you can redistribute it and/or
 *  modify it under the terms of the GNU Lesser General Public
 *  License as published by the Free Software Foundation:
 *  version 2.1 of the License.
 *
 *  This library is distributed in the hope that it will be useful,
 *  but WITHOUT ANY WARRANTY; without even the implied warranty of
 *  MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the GNU
 *  Lesser General Public License for more details.
 *
 *  You should have received a copy of the GNU Lesser General Public
 *  License along with this library; if not, write to the Free Software
 *  Foundation, Inc., 51 Franklin Street, Fifth Floor, Boston,
 *  MA  02110-1301  USA
 */

#include <stdio.h>
#include <stdlib.h>
#include <unistd.h>
#include <getopt.h>
#include <string.h>
#include <sys/time.h>
#include <assert.h>
#include <syslog.h>
#include <signal.h>

#ifdef CMAKE_BUILD
#include "lws_config.h"
#endif

#include "libwebsockets.h"

int force_exit = 0;

#define MAX_ECHO_PAYLOAD 1400

struct per_session_data__echo {
	unsigned char buf[LWS_SEND_BUFFER_PRE_PADDING + MAX_ECHO_PAYLOAD + LWS_SEND_BUFFER_POST_PADDING];
	unsigned int len;
	unsigned int index;
};

// Temporary solution. Having context+wsi but a single queue doesn't make sense
#define MSIZE 10
char outgoing_queue[MSIZE][500];
int outgoing_index = -1;

char* incoming_queue[MSIZE];
int incoming_index = -1;

static int
callback_echo(struct libwebsocket_context *context,
		struct libwebsocket *wsi,
		enum libwebsocket_callback_reasons reason, void *user,
							   void *in, size_t len)
{
	struct per_session_data__echo *pss = (struct per_session_data__echo *)user;
	int n;

	switch (reason) {
	/* when the callback is used for client operations --> */

	case LWS_CALLBACK_CLIENT_ESTABLISHED:
		lwsl_notice("Client has connected\n");
		pss->index = 0;
		break;

	case LWS_CALLBACK_CLIENT_RECEIVE:
		lwsl_notice("Client RX: %s", (char *)in);
		break;

	case LWS_CALLBACK_CLIENT_WRITEABLE:
		/* we will send our packet... */
		if(outgoing_index >= 0){
			pss->len = sprintf((char *)&pss->buf[LWS_SEND_BUFFER_PRE_PADDING],
					"%s",
					//"{\"name\":\"message\",\"data\":\"Algo\"}");
					outgoing_queue[outgoing_index]);
			lwsl_notice("Client TX: %s", &pss->buf[LWS_SEND_BUFFER_PRE_PADDING]);
			n = libwebsocket_write(wsi, &pss->buf[LWS_SEND_BUFFER_PRE_PADDING], pss->len, LWS_WRITE_TEXT);
			if (n < 0) {
				lwsl_err("ERROR %d writing to socket, hanging up\n", n);
				return -1;
			}
			if (n < pss->len) {
				lwsl_err("Partial write\n");
				return -1;
			}
			outgoing_index--;
		}
		break;
	default:
		break;
	}

	return 0;
}



static struct libwebsocket_protocols protocols[] = {
	/* first protocol must always be HTTP handler */

	{
		"default",		/* name */
		callback_echo,		/* callback */
		sizeof(struct per_session_data__echo)	/* per_session_data_size */
	},
	{
		NULL, NULL, 0		/* End of list */
	}
};

void sighandler(int sig)
{
	force_exit = 1;
}

int send_event(char* msg, struct libwebsocket_context *context,
		struct libwebsocket *wsi){
	if(outgoing_index < MSIZE){
        printf("Sending: %s\n",msg);
		strcpy(outgoing_queue[outgoing_index+1],msg);
		outgoing_index+=1;
		libwebsocket_callback_on_writable(context,wsi);
		return 1;
	}
	return 0;
}

void send_message(char* msg, struct libwebsocket_context *context,
		struct libwebsocket *wsi){
	char template[] = "{\"name\":\"message\",\"data\":\"\"}";

	char event[strlen(template)+strlen(msg)];
	sprintf(event,"{\"name\":\"message\",\"data\":\"%s\"}",msg);
	send_event(event,context,wsi);
}

void subscribe_to(char* msg, struct libwebsocket_context *context,
		struct libwebsocket *wsi){
	char template[] = "{\"name\":\"subscribe\",\"data\":{\"name\":\"%s\"}}";

	char event[strlen(template)+strlen(msg)-2];
	sprintf(event,template,msg);
	send_event(event,context,wsi);

}

static struct option options[] = {
	{ "help",	no_argument,		NULL, 'h' },
	{ "debug",	required_argument,	NULL, 'd' },
	{ "server",	required_argument,	NULL, 'a' },
	{ "port",	required_argument,	NULL, 'p' },
	{ "ratems",	required_argument,	NULL, 'r' },
	{ "ssl",	no_argument,		NULL, 's' },
	{ "interface",  required_argument,	NULL, 'i' },
	{ NULL, 0, 0, 0 }
};

int main(int argc, char **argv)
{
	int n = 0;
	int port = 7681;
	int use_ssl = 0;
	struct libwebsocket_context *context;
	int opts = 0;
	char interface_name[128] = "";
	const char *interface = NULL;
	int syslog_options = LOG_PID | LOG_PERROR;
	int listen_port;
	struct lws_context_creation_info info;
	char address[256];
	int rate_us = 500000;
	unsigned int oldus = 0;
	struct libwebsocket *wsi;

	int debug_level = 7;

	memset(&info, 0, sizeof info);

	lwsl_notice("Built to support client operations\n");

	while (n >= 0) {
		n = getopt_long(argc, argv, "i:hsp:d:D"
			"c:r:"
				, options, NULL);
		if (n < 0)
			continue;
		switch (n) {
		case 'a':
			strcpy(address, optarg);
			port = 80;
			break;
		case 'r':
			rate_us = atoi(optarg) * 1000;
			break;
		case 'd':
			debug_level = atoi(optarg);
			break;
		case 's':
			use_ssl = 1; /* 1 = take care about cert verification, 2 = allow anything */
			break;
		case 'p':
			port = atoi(optarg);
			break;
		case 'i':
			strncpy(interface_name, optarg, sizeof interface_name);
			interface_name[(sizeof interface_name) - 1] = '\0';
			interface = interface_name;
			break;
		case '?':
		case 'h':
			fprintf(stderr, "Usage: libwebsockets-test-echo "
					"[--ssl] "
					"[--server <remote ads>] "
					"[--ratems <ms>] "
					"[--port=<p>] "
					"[-d <log bitfield>]\n");
			exit(1);
		}
	}

	/* we will only try to log things according to our debug_level */
	setlogmask(LOG_UPTO (LOG_DEBUG));
	openlog("lwsts", syslog_options, LOG_DAEMON);

	/* tell the library what debug level to emit and to send it to syslog */
	lws_set_log_level(debug_level, lwsl_emit_syslog);

	lwsl_notice("libwebsockets echo test - "
			"(C) Copyright 2010-2013 Andy Green <andy@warmcat.com> - "
						    "licensed under LGPL2.1\n");

	lwsl_notice("Running in client mode\n");
	listen_port = CONTEXT_PORT_NO_LISTEN;
	if (use_ssl)
		use_ssl = 2;

	info.port = listen_port;
	info.iface = interface;
	info.protocols = protocols;
	info.extensions = libwebsocket_get_internal_extensions();

	info.gid = -1;
	info.uid = -1;
	info.options = opts;

	context = libwebsocket_create_context(&info);

	if (context == NULL) {
		lwsl_err("libwebsocket init failed\n");
		return -1;
	}

	lwsl_notice("Client connecting to %s:%u....\n", address, port);
	/* we are in client mode */
	wsi = libwebsocket_client_connect(context, address,
			port, use_ssl, "/", address,
			 "origin", NULL, -1);
	if (!wsi) {
		lwsl_err("Client failed to connect to %s:%u\n", address, port);
		goto bail;
	}
	lwsl_notice("Client connected to %s:%u\n", address, port);
	signal(SIGINT, sighandler);

	libwebsocket_callback_on_writable(context, wsi);

	subscribe_to("message",context, wsi);
	n = 0;
	while (n >= 0 && !force_exit) {
		struct timeval tv;

		gettimeofday(&tv, NULL);

		if (((unsigned int)tv.tv_usec - oldus) > rate_us) {
			send_message("Algo",context, wsi);
			oldus = tv.tv_usec;
		}
		n = libwebsocket_service(context, 10);
	}

bail:
	libwebsocket_context_destroy(context);

	lwsl_notice("libwebsockets-test-echo exited cleanly\n");

	closelog();

	return 0;
}
