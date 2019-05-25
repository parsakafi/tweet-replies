const express = require('express');
const bodyParser = require('body-parser');
const twitterPackage = require('twitter');
const validUrl = require('valid-url');
const dateformat = require('dateformat');
const linkifyHtml = require('linkifyjs/html');
const url = require('url');
const f = require('./functions');
const app = express();
require('dotenv').config();
const port = process.env.PORT || 3000;
app.set('view engine', 'ejs');
app.use(bodyParser.urlencoded({
    extended: true
}));

const secret = {
    consumer_key: process.env.twitter_consumer_key,
    consumer_secret: process.env.twitter_consumer_secret,
    access_token_key: process.env.twitter_access_token_key,
    access_token_secret: process.env.twitter_access_token_secret
};

const Twitter = new twitterPackage(secret);
const rtl_languages = ['fa', 'ar', 'arc', 'dv', 'ha', 'he', 'khw', 'ks', 'ku', 'ps', 'ur', 'yi'];

app.all('/', async (request, response) => {
    let tweet_id = false,
        tweet_request = false;

    if (request.method === 'GET' && request.query.tweet)
        tweet_request = request.query.tweet;
    else if (request.method === 'GET') {
        response.render('index');
        return;
    } else if (request.body.tweet)
        tweet_request = request.body.tweet;

    if (validUrl.isUri(tweet_request)) {
        tweet_request = tweet_request.split('?')[0];
        let URL = url.parse(tweet_request);
        if (URL.host === 'twitter.com')
            tweet_id = URL.path.split('/')[3];
        else if (URL.host === 't.co') {
            try {
                const unshorten = await f.unshorten(tweet_request);
                console.log('unshorten link: ', unshorten);
                if (unshorten) {
                    URL = url.parse(unshorten);
                    if (URL.host === 'twitter.com')
                        tweet_id = URL.path.split('/')[3];
                }
            } catch (e) {
                console.log('Error: ', e);
            }
        }
    }
    if (!tweet_id && f.isNumeric(tweet_request)) {
        tweet_id = tweet_request;

    } else if (!tweet_id) {
        console.log('Error: Tweet ID/URL Invalid.');
        response.render('index', {
            error: true
        });
        return;
    }

    console.log('Tweet ID: ', tweet_id);

    Twitter.get(`statuses/show/${tweet_id}`, {
        trim_user: false,
        include_entities: true,
        tweet_mode: 'extended'
    }, function (error, tweet, res) {
        if (!error) {
            let tweets_ = [],
                rtl = false,
                cd = '';
            const username = tweet.user.screen_name;
            const params = {
                q: 'to:' + username,
                count: 200,
                since_id: parseFloat(tweet.id_str),
                max_id: null,
                tweet_mode: 'extended'
            };
            Twitter.get('search/tweets', params, function (error, tweets, res) {
                if (!error) {
                    const statuses = tweets.statuses;
                    //response.send(statuses).end();
                    for (let status in statuses) {
                        if (statuses[status].user.screen_name === username && statuses[status].entities.user_mentions.length === 0) {
                            rtl = f.hasOwnProperty(statuses[status], 'lang') ? rtl_languages.indexOf(statuses[status].lang) > -1 : false;
                            cd = dateformat(statuses[status].created_at, "yyyy mmmm d - HH:MM:ss");
                            text = linkifyHtml(statuses[status].full_text, {
                                defaultProtocol: 'https'
                            });
                            link = `https://twitter.com/${username}/status/${statuses[status].id_str}`;
                            tweets_.push({
                                created_at: cd,
                                text: text,
                                link: link,
                                rtl: rtl
                            });
                        }
                    }
                    rtl = f.hasOwnProperty(tweet, 'lang') ? rtl_languages.indexOf(tweet.lang) > -1 : false;
                    cd = dateformat(tweet.created_at, "yyyy mmmm d - HH:MM:ss");
                    text = linkifyHtml(tweet.full_text, {
                        defaultProtocol: 'https'
                    });
                    link = `https://twitter.com/${username}/status/${tweet.id_str}`;
                    tweets_.push({
                        created_at: cd,
                        text: text,
                        link: link,
                        rtl: rtl
                    });
                    tweets_.reverse();
                    output = {
                        'full_name': tweet.user.name,
                        'username': username,
                        'share_link': 'https://tweet-replies.herokuapp.com?tweet=' + tweet_id,
                        'tweets': tweets_
                    };
                    response.render('index', {
                        tweets: output
                    });
                    return false;
                } else {
                    console.error('error 2: ', error);
                    response.render('index', {
                        error: true
                    });
                    return false;
                }
            });
        } else {
            console.error('error 1: ', error);
            response.render('index', {
                error: true
            });
            return false;
        }
    });
}).listen(port, () => {
    console.log(`App listen on port ${port}`);
});