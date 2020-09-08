$(document).ready(function() {
    const formatNumber = n => ("0" + n).slice(-2);
    const url = "https://sodalabs.io.s3-ap-southeast-2.amazonaws.com/metadata.json";
    let wpn = ""
    const date = new Date();
    $.ajax({
      type: "GET",
      url: url,
      success: function(data) {
        // console.log(data)
        // check if JSON file is stringified
        if (typeof data == 'string'){
          data = JSON.parse(data)
        }
        // console.log(data)
        currentYear = date.getFullYear();
        if (data.papers.length > 0){
          let currentPapers = data.papers.filter(a=>a.year==currentYear);
          wpn = currentYear + "-" + formatNumber(currentPapers.length+1) // note: only handles 01-99
        } 
        else{
          wpn = currentYear + "-" + "01"
        }
        $("#wpn").attr("placeholder", wpn); // set the placeholder
        $("#wpn").val(wpn)
      },
      error: function(error) {
        console.log(`Error ${error}`)
      }
      });
      // Add the following code if you want the name of the file appear on select
      $(".custom-file-input").on("change", function() {
        let fileName = $(this).val().split("\\").pop();
        $(this).siblings(".custom-file-label").addClass("selected").html(fileName);
      });
      // const isEmail = input => /^\w+@[a-zA-Z_]+?\.[a-zA-Z]{2,3}$/.test(input);
      // $('#keyword').tagEditor({
      //     // placeholder: 'Enter tags ...',
      //     placeholder: "applied economics, policy & governance ..",
      //     beforeTagSave: (field, editor, tags, tag, val) => {
      //     // make sure it is a formally valid email
      //     if (!isEmail(val)) {
      //       console.log(`"${val}" is not a valid email`);
      //       return false;
      //     }
      //   }
      // });
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
         // var forms = document.getElementsByClassName('needs-validation');
             // Loop over them and prevent submission
             // var validation = Array.prototype.filter.call(forms, function(form) {
           // form.addEventListener('submit', function(event) {
                 if (form.checkValidity() === false) {
                   event.preventDefault();
                   event.stopPropagation();
                   form.classList.add('was-validated');
                 }
                 else{
                    $('#confirmModal').modal('show');
                 }

    });

      $("#submitPaper").click(function(e) {
        // e.preventDefault();
        // Fetch all the forms we want to apply custom Bootstrap validation styles to
        // var form = document.getElementById('wpForm');
        // var forms = document.getElementsByClassName('needs-validation');
            // Loop over them and prevent submission
            // var validation = Array.prototype.filter.call(forms, function(form) {
          // form.addEventListener('submit', function(event) {
                // if (form.checkValidity() === false) {
                //   event.preventDefault();
                //   event.stopPropagation();
                //   form.classList.add('was-validated');
                // }
                // else{

                  $('#confirmModal').modal('hide');
                  $('button').prop('disabled', true);
                  $('#confirmSubmission').prepend(`<span id="spinner" class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>`);
                  console.log('Processing ..')
                  let base64;
                  let author = [];
                  var reader = new FileReader(),
                  file = $('#inputFile')[0];
                  $('.dynamic-wrap input').each(function(index){ author.push($(this).val()) });
                  reader.onload = function () {
                      let result = reader.result;
                      base64 = result.replace(/^[^,]*,/, '')
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
                        file: base64
                    }
                console.log(data)
                $('#messageModal').on('hide', function() {
                    window.location.reload();
                });
                // return;
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
                      //   msg = `<div class="alert alert-success alert-dismissible fade show" role="alert">
                      //   <strong>Done!</strong> Your paper has been successfully submitted. Here's the link below: <a href="${response.body.url}">${response.body.url}</a>
                      //   <button type="button" class="close" data-dismiss="alert" aria-label="Close">
                      //     <span aria-hidden="true">&times;</span>
                      //   </button>
                      // </div>`

                      $('.modal-body').prepend(`<p><strong>Done!</strong></p><p>Your paper has been successfully submitted. Here's the link below:</p><p><a href="${response.body.url}">${response.body.url}</a></p>`)
                        $("#spinner").remove();
                        $('button').prop('disabled', false);
                        // $(document).scrollTop($(document).height()); 
                        // $('#msg').html(msg);
                        $('#messageModal').modal('show');
                        console.log('Done!')
                    },
                    error: function(){
                        console.log("error!") 
                        msg = `<div class="alert alert-danger alert-dismissible fade show" role="alert">
                        <strong>:(</strong> An error has occurred. Please try again later.
                        <button type="button" class="close" data-dismiss="alert" aria-label="Close">
                          <span aria-hidden="true">&times;</span>
                        </button>
                      </div>`
                        $('#msg').html(msg);
                        $('.modal-body').prepend(`<p><strong>Oops!</strong></p><p>There's been an error.</p>`)
                        $("#spinner").remove();
                        $('button').prop('disabled', false);
                        // $(document).scrollTop($(document).height()); 
                        // $('#msg').html(msg);
                        $('#messageModal').modal('show');
                    }
                });
                  };
                  reader.readAsDataURL(file.files[0]);
            // }
          });
  });