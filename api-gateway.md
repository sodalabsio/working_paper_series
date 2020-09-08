# api-gateway

- Set up an API endpoint to route the data from the website to `uploadWorkingPaper` lambda function. The endpoint should be provided to `sodalabs.io/assets/js/wps.js`.
- Create a new endpoint: `/upload`
- Select Method: `POST`
- Make sure to enable `CORS`
- Select `POST` and under `Integration Request`:
    - Select `Lambda Function` as the `Integration Type`  
    - Configure the following in `Mapping template`:
        - Content-Type: `application/json`
        - Template:
        ```
        {
            "content": {
                #foreach( $token in $input.path('$').split('&') )
                    #set( $keyVal = $token.split('=') )
                    #set( $keyValSize = $keyVal.size() )
                    #if( $keyValSize >= 1 )
                        #set( $key = $util.urlDecode($keyVal[0]) )
                        #if( $keyValSize >= 2 )
                            #set( $val = $util.urlDecode($keyVal[1]) )
                        #else
                            #set( $val = '' )
                        #end
                        "$key": "$val"#if($foreach.hasNext),#end
                    #end
                #end
            }
        }
        ```