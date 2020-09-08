import json
import io
import logging
import base64
import boto3
import pdfkit
import urllib.parse
import datetime
from PyPDF2 import PdfFileMerger, PdfFileReader

SOURCE_BUCKET = 'sodalabs.io'
TARGET_BUCKET = 'soda-wps'
META_PATH = 'metadata.json'
TEMPLATE_PATH = 'assets/img/wp_cover_static.png'

HTML = """
        
        <!DOCTYPE html>
        <html>
          <head>
            <title>SoDa WP Series</title>
            <link href='https://fonts.googleapis.com/css?family=Roboto Condensed' rel='stylesheet'>
            <style>
            .wrap-text {{
                max-width: 1000px;
            }}
            .text-color {{
                color: gray;
            }}
            .paper-title {{
              position: absolute;
              top: 520px;
              left: 60px;
              font-family: 'Roboto Condensed';font-size: 35pt; 
              font-weight: 400; /*regular*/
              /* 23pt; */
            }}
            .author-names {{
              position: absolute;
              top: 690px;
              left: 60px;
              font-family: 'Roboto Condensed';font-size: 25pt;
              font-weight: 300; /*light*/
            }}
            .wps-a {{
              position: absolute;
              top: 800px;
              left: 60px;
              font-family: 'Roboto Condensed';font-size: 25pt;
              font-weight: 300;
            }}
            .wps-b {{
              position: absolute;
              top: 850px;
              left: 60px;
              font-family: 'Roboto Condensed';font-size: 25pt;
            }}
            .ref-a {{
              position: absolute;
              top: 930px;
              left: 60px;
              font-family: 'Roboto Condensed';font-size: 12pt;
            }}
            .ref-b {{
              position: absolute;
              top: 965px;
              left: 60px;
              font-family: 'Roboto Condensed';font-size: 15pt;
            }}
            .pub-a {{
              position: absolute;
              top: 1045px;
              left: 60px;
              font-family: 'Roboto Condensed';font-size: 12pt;
            }}
            .pub-b {{
              position: absolute;
              top: 1075px;
              left: 60px;
              font-family: 'Roboto Condensed';font-size: 15pt;
            }}
        </style>
          </head>
          <body>
            <img src="data:image/png;base64, {}" alt="wp-background" />
              <div class="paper-title wrap-text">{}</div>
              <div class="author-names wrap-text">{}</div>
              <div class="wps-a wrap-text">SoDa Laboratories Working Paper Series</div>
              <div class="wps-b wrap-text">No. {}</div>
              <div class="ref-a wrap-text">REF</div>
              <div class="ref-b wrap-text">{}</div>
              <div class="pub-a wrap-text">PUBLISHED ONLINE</div>
              <div class="pub-b wrap-text">{}</div>
          </body>
        </html>
        """

s3 = boto3.client('s3', verify=False)

logger = logging.getLogger()
logger.setLevel(logging.INFO)

def read_from_bucket(bucket, key):
    """Read file from S3"""
    obj = s3.get_object(Bucket=bucket, Key=key)
    return json.loads(obj['Body'].read().decode('utf-8'))

def postprocess(file, file_path, config, **kwargs):
    """Method to postprocess HTML and merge with PDF"""
    # read static template
    file_content = base64.b64decode(file)
    obj = s3.get_object(Bucket=SOURCE_BUCKET, Key=TEMPLATE_PATH)
    img = obj['Body'].read()      
    b64_img = base64.b64encode(img).decode("utf-8") # get base64 string
    
    title = kwargs.get('title')
    authors = kwargs.get('author')
    wpn = kwargs.get('wpn')
    link = 'https://{}.s3-ap-southeast-2.amazonaws.com/{}'.format(TARGET_BUCKET, file_path)
    ref = authors  + ' (' + wpn.split('-')[0] + '), ' +  'SoDa Laboratories Working Paper Series No. ' + wpn + ', Monash Business School, available at ' + link
    pub_online = kwargs.get('pub_online') # get date/parse to dd mon yyy
    
    # add content to html
    # authors = ', '.join(authors)
    html = HTML.format(b64_img, title, authors, wpn, ref, pub_online)
    # convert html to pdf (bytes)
    # pdf = pdfkit.from_string(html, False) 
    pdf = pdfkit.from_string(html, False, configuration=config)
    
    # merge pdf + file
    output = io.BytesIO()
    mergedObject = PdfFileMerger()
    mergedObject.append(PdfFileReader(io.BytesIO(pdf)))
    mergedObject.append(PdfFileReader(io.BytesIO(file_content)))
    mergedObject.write(output)
    
    return output.getvalue(), link
    
def create_rdf(link, handle, **kwargs):
    """Method to create RDFs
    reference: https://ideas.repec.org/t/papertemplate.html
    """
    title = kwargs.get('title')
    abstract = kwargs.get('abstract')
    authors = kwargs.get('author')
    email = kwargs.get('email')
    wpn = kwargs.get('wpn')
    pub_online = kwargs.get('pub_online')
    jel_code = kwargs.get('jel_code')
    keywords = kwargs.get('keyword')
    _, month, yyyy = pub_online.split(" ")
    datetime_object = datetime.datetime.strptime(month, "%B")
    mm = "{0:0=2d}".format(datetime_object.month)
    paper_date = yyyy + "-" + mm # yyyy-mm
    
    workplace_name = "SoDa Laboratories, Monash University"
    temp = "Template-Type: ReDIF-Paper 1.0\n" # template
    # add authors
    authors = authors.split(",")
    for i, author in enumerate(authors):
      temp += "Author-Name: " + author + "\n"
      if i == 0: # only first authors email 
        temp += "Author-Email: " + email + "\n"
      temp += "Author-Workplace-Name: " + workplace_name + "\n"
    
    # add title
    temp += "Title: " + title + "\n"
    # add abstract
    temp += "Abstract: " + abstract + "\n"
    # add creation date
    temp += "Creation-Date: " + paper_date + "\n" # yyyy-mm
    # add file-url
    temp += "File-URL: " + link + "\n"
    # add file-format
    temp += "File-Format: Application/pdf" + "\n"
    # add number - make sure they allow hyphens!
    temp += "Number: " + wpn + "\n"
    # add JEL code
    temp += "Classification-JEL: " + jel_code + "\n"
    # add keywords
    temp += "Keywords: " + keywords + "\n"
    # add handle
    temp += "Handle :" + handle + ":" + wpn + "\n"
    return temp

def lambda_handler(event, context):
    data = event['content']
    wpn = data['wpn']
    title = data['title']
    email = data['email']
    author = data['author']
    keyword = data['keyword']
    jel_code = data['jel_code']
    abstract = urllib.parse.unquote(data['abstract']) # decodeURI
    file = data['file']
    pub_online = data['pub_online']
    logger.info('data received..')
    
    config = pdfkit.configuration(wkhtmltopdf='/opt/bin/wkhtmltopdf')
    logger.info('binaries found..')
    
    meta = read_from_bucket(SOURCE_BUCKET, META_PATH)
    path = meta['handle'].replace(':', '/') + '/' + wpn
    file_path = path + '.pdf'
    rdf_path = path + '.rdf'
    
    metadata = {'wpn' : wpn,
                'title': title,
                'year': int(wpn.split('-')[0]),
                'email': email,
                'author': author,
                'keyword' : keyword,
                'jel_code': jel_code,
                'abstract' : abstract,
                'pub_online': pub_online
                }
    meta['papers'].append(metadata)
    output, link = postprocess(file, file_path, config, **metadata)
    rdf = create_rdf(link, meta['handle'], **metadata) # create RDF
    try:
        # upload processed PDF
        s3.put_object(Bucket=TARGET_BUCKET, Key=file_path, Body=output)
        # upload RDF file
        s3.put_object(Bucket=TARGET_BUCKET, Key=rdf_path, Body=rdf)
        # update metadata.json
        s3.put_object(Body=json.dumps(meta), Bucket=SOURCE_BUCKET, Key=META_PATH)
        
    except Exception as e:
        raise IOError(e)
    response = {
        "statusCode": 200,
        "headers": {
        "Access-Control-Allow-Origin" : "*", # Required for CORS support to work
        "Access-Control-Allow-Credentials" : True # Required for cookies, authorization headers with HTTPS 
        },
        "body": {
            'msg': 'File: {} successfully processed.'.format(wpn),
            'url' : link
        }
    }
    return response