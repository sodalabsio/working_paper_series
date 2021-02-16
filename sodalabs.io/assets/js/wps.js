$(document).ready(function() {

    function triggerError(msg){
      $("#errorModal .modal-body").html("");
      $('#errorModal .modal-body').prepend(msg)
      $("#spinner").remove();
      $('button').prop('disabled', false);
      $('#errorModal').modal('show');
    }

    const formatNumber = n => ("0" + n).slice(-2);
    let wpn = ""
    const date = new Date();
    const maxAllowedSize = 25 * 1024 * 1024; // max limit of file size
    let currentYear = date.getFullYear(); 
    let currentPapers = 0;
    let prefix = `RePEc/ajr/sodwps/${currentYear}-`;
    // AWS credentials
    let bucketName = "soda-wps";
    const bucketRegion = "ap-southeast-2";
    const IdentityPoolId = "ap-southeast-2:39b53048-8af5-475b-9c7e-24057d7f4b71";
    
    // aws cognito
    AWS.config.update({
      region: bucketRegion,
      credentials: new AWS.CognitoIdentityCredentials({
        IdentityPoolId: IdentityPoolId
      })
    });
    let s3 = new AWS.S3({
      // apiVersion: "2012-10-17",
      params: { Bucket: bucketName }
    });
    var params = {
      Bucket: bucketName,
      Delimiter: '/',
      Prefix: prefix
     }
     // get the no of papers
     // Test - max key limit (1000?)
     s3.listObjects(params, function (error, data) {
      if (error){
        console.log(`Error ${error}`)
        let msg = `<p><strong>Oops!</strong></p><p>An error has occurred. Please try again later.</p>`
        triggerError(msg)
      }
      else{
        currentPapers = data.Contents.length / 2 // ignoring RDF files
        if (currentPapers > 0){ // if there are papers
          wpn = currentYear + "-" + formatNumber(currentPapers+1) // note: only handles 01-99
        }
        else{
          wpn = currentYear + "-" + "01"
        }
        $("#wpn").attr("placeholder", wpn); // set the placeholder
        $("#wpn").val(wpn)
      }
     });
      // Add the following code if you want the name of the file appear on select
      $(".custom-file-input").on("change", function() {
        let fileName = $(this).val().split("\\").pop();
        $(this).siblings(".custom-file-label").addClass("selected").html(fileName);
      });

      $(document).on('click', '.btn-add', function(e) {
        // $("#addAuthor").click(function(e) {
        e.preventDefault();
    
        var dynaForm = $('.dynamic-wrap'),
          currentEntry = $(this).parents('.entry:first'),
          newEntry = $(currentEntry.clone()).appendTo(dynaForm);
    
        newEntry.find('input').val('');
        dynaForm.find('.entry:not(:last) .btn-add')
          .removeClass('btn-add').addClass('btn-remove')
          .removeClass('btn-primary').addClass('btn-secondary')
          .html('<i class="fa fa-times"></i>');
      }).on('click', '.btn-remove', function(e) {
        $(this).parents('.entry:first').remove();
    
        e.preventDefault();
        return false;
      });

      $("#confirmSubmission").click(function(e) {
         // Fetch all the forms we want to apply custom Bootstrap validation styles to
        var form = document.getElementById('wpForm');
        if (form.checkValidity() === false) {
          event.preventDefault();
          event.stopPropagation();
          form.classList.add('was-validated');
        }
        else{

          fileSize = $('#inputFile')[0].files[0].size
          if (fileSize > maxAllowedSize){
            let msg = `<p><strong>File too large.</strong></p><p>Please upload a PDF file which is less than 25 MB in size.</p>`
            triggerError(msg)
          }
          else{
            $('#confirmModal').modal('show');
          }
        }
    });

    $("#confirmUpdate").click(function(e) {
      // Fetch all the forms we want to apply custom Bootstrap validation styles to
     var form = document.getElementById('wpFormUpdate');
     if (form.checkValidity() === false) {
       event.preventDefault();
       event.stopPropagation();
       form.classList.add('was-validated');
     }
     else{

       fileSize = $('#inputUpdateFile')[0].files[0].size
       if (fileSize > maxAllowedSize){
         let msg = `<p><strong>File too large.</strong></p><p>Please upload a PDF file which is less than 25 MB in size.</p>`
         triggerError(msg)
       }
       else{
        wpn = $('#wpn-update').val()
        bucketName = "sodalabs.io"
        let s3 = new AWS.S3({
          // apiVersion: "2012-10-17",
          params: { Bucket: bucketName }
        });
        var params = {
          Bucket: bucketName, 
          Key: "metadata.json"
         };
        // fetch details from metadata.json
        s3.getObject(params, function (error, data) {
          if (error){
            console.log(`Error ${error}`)
            let msg = `<p><strong>Oops!</strong></p><p>An error has occurred. Please try again later.</p>`
            triggerError(msg)
          }
          else{
            data = data.Body.toString('utf-8'); // Use the encoding necessary
            if (typeof data == 'string'){
              data = JSON.parse(data)
            }
            console.log(data)
            let currentPaper = data.papers.filter(a=>a.wpn==wpn);
            console.log(currentPaper)
            if (currentPaper.length > 0){
              $("#updateModal .modal-body").html("");
              let verifyMsg = `<p>You are about to overwrite the following paper: 
              <ul>
                <li>WPN: <b>${currentPaper[0].wpn}</b></li>
                <li>Title: <b>${currentPaper[0].title}</b></li>
                <li>Authors: <b>${currentPaper[0].author}</b></li>
              </ul> with a new version.</p>
                <p>Doing so will make the existing version unavailable and only the new version will be available from now.</p>
                <p>If you wish to continue, click CONFIRM, or click Cancel, to go back</p>`
              $('#updateModal .modal-body').prepend(verifyMsg)
              $('#updateModal').modal('show');
            }
            else{
              let msg = `<p><strong>Oops!</strong></p><p>The paper you requested for does not exist. Please enter a valid working paper number.</p>`
              triggerError(msg)
            }
          }
         });
       }
     }
 });

    $("#closeBtn").click(function(e) {
      $('form').get(0).reset();
      window.location.reload();
    }); 

      $("#submitPaper").click(function(e) {

                  $('#confirmModal').modal('hide');
                  $('button').prop('disabled', true);
                  $('#confirmSubmission').prepend(`<span id="spinner" class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>`);
                  console.log('Processing ..')
                  let base64;
                  let author = [];
                  // var form = document.getElementById('wpForm');
                  var reader = new FileReader(),
                  file = $('#inputFile')[0];
                  $('.dynamic-wrap input').each(function(index){ author.push($(this).val()) });
                  reader.onload = function () {
                      let result = reader.result;
                      base64 = result.replace(/^[^,]*,/, '')
                
                // upload raw PDF file to S3
                var s3 = new AWS.S3( { params: {Bucket: "soda-wps"} } );
                //  Inside your router method (ContentType should be set to the content type of the image file):
                // data:application/pdf;base64,JVBERi0xLjMKJcTl8uXrp/Og0MTGCjQgMCBvYmoKPDwgL0xlbmd0aCA1IDAgUiAvRmlsdGV
                    // buf = new Buffer.from(base64,'base64')
                    var data = {
                      Key: `temp/${wpn}`, 
                      Body: base64,
                      ContentEncoding: 'base64',
                      ContentType: 'application/pdf'
                    };
                    s3.putObject(data, function(err, data){
                        if (err) { 
                          console.log(err);
                          console.log('Error uploading data: ', data); 
                        } else {
                          console.log('Successfully uploaded the file!');

                        // all values are string
                          let data = {
                            wpn : $('#wpn').val(),
                            title: $('#title').val(),
                            email: $('#email').val(),
                            author: author.join(', '),
                            keyword: $("#keyword").tagsinput('items').join(', '),
                            jel_code:  $('#jel').val(),
                            abstract: encodeURIComponent($('#abstract').val()),
                            pub_online:  date.getDate() + ' ' + date.toLocaleString('default', { month: 'long' }) + ' ' + date.getFullYear(),
                            // file: base64,
                            mode: 'upload'
                        }
                          
                          // send paper metadata and trigger Lambda function
                          $.ajax({
                            url: "https://5v0dil8zg2.execute-api.ap-southeast-2.amazonaws.com/v1/upload",
                            type: "POST",
                            contentType: 'application/json',
                            dataType: 'json',
                            accept: 'application/json',
                            processData: true,
                            data: data,
                            success: function (response) {
                              console.log(response)      
                              if ('errorMessage' in response){
                                let msg = `<p><strong>Oops!</strong></p><p>An error has occurred. Please try again later.</p>`
                                triggerError(msg)
                              }
                              else {
                                $("#messageModal .modal-body").html("");
                                $('#messageModal .modal-body').prepend(`<p><strong>Done!</strong></p><p>Your paper has been successfully submitted. Here's the link below:</p><p><a href="${response.body.url}">${response.body.url}</a></p>`)
                                  $("#spinner").remove();
                                  $('button').prop('disabled', false);
                                  $('#messageModal').modal('show');
                                  console.log('Done!')
                              }
                            },
                            error: function(){
                                console.log("error!") 
                                let msg = `<p><strong>Oops!</strong></p><p>An error has occurred. Please try again later.</p>`
                                triggerError(msg)
                            }
                        });

                        }
                    });
                  };
                  reader.readAsDataURL(file.files[0]);
            // }
          });


          $("#updatePaper").click(function(e) {
            
              $('#updateModal').modal('hide');
              $('button').prop('disabled', true);
              $('#confirmUpdate').prepend(`<span id="spinner" class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>`);
              console.log('Processing ..')


                      let base64;
                      let author = [];
                      // var form = document.getElementById('wpForm');
                      var reader = new FileReader(),
                      file = $('#inputUpdateFile')[0];
                      reader.onload = function () {
                          let result = reader.result;
                          base64 = result.replace(/^[^,]*,/, '')
                          // all values are string
                          let wpn = $('#wpn-update').val()
                      // upload raw PDF file to S3
                      var s3 = new AWS.S3( { params: {Bucket: "soda-wps"} } );
                          var data = {
                            Key: `temp/${wpn}`, 
                            Body: base64,
                            ContentEncoding: 'base64',
                            ContentType: 'application/pdf'
                          };
                          s3.putObject(data, function(err, data){
                              if (err) { 
                                console.log(err);
                                console.log('Error uploading data: ', data); 
                              } else {
                                console.log('Successfully uploaded the file!');

                          let data = {
                            wpn : wpn,
                            // file: base64,
                            mode: 'update'
                        }
                          $.ajax({
                              url: "https://5v0dil8zg2.execute-api.ap-southeast-2.amazonaws.com/v1/upload",
                              type: "POST",
                              contentType: 'application/json',
                              dataType: 'json',
                              accept: 'application/json',
                              processData: true,
                              data: data,
                              success: function (response) {
                                  console.log(response)      
                                  if ('errorMessage' in response){
                                    let msg = `<p><strong>Oops!</strong></p><p>An error has occurred. Please try again later.</p>`
                                    triggerError(msg)
                                  }
                                  else{
                                    $("#messageModal .modal-body").html("");
                                    $('#messageModal .modal-body').prepend(`<p><strong>Done!</strong></p><p>Your paper has been successfully updated. Here's the link below:</p><p><a href="${response.body.url}">${response.body.url}</a></p>`)
                                    $("#spinner").remove();
                                    $('button').prop('disabled', false);
                                    $('#messageModal').modal('show');
                                    console.log('Done!')
                                  }
                              },
                              error: function(){
                                let msg = `<p><strong>Oops!</strong></p><p>An error has occurred. Please try again later.</p>`
                                triggerError(msg)
                              }
                          });




                              }
                            
                            });






                      };


                      reader.readAsDataURL(file.files[0]);
                // }
              });
  });