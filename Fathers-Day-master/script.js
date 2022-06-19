$(function () {


  document.addEventListener('DOMContentLoaded', function () {
    function audioAutoPlay() {
      var audio_ = document.getElementById('audio')
      document.addEventListener("WeixinJSBridgeReady", function () {
        audio_.play()
      }, false)
    }
    audioAutoPlay()
  });


  if (!$('.envelope').hasClass('open')) {
    $('.envelope').click(function () {
      $(this).removeClass('new').addClass('open');
      $("h1").css("display","block")
    });
  }

  $('.mailform input, .mailform textarea').on('keyup', function () {
    if (this.value !== '') {
      $(this).prev('label').addClass('show');
    } else {
      $(this).prev('label').removeClass('show');
    }
  }).on("focus", function () {
    $(this).prev("label").addClass('focus');
  }).on("blur", function () {
    $(this).prev("label").removeClass('focus');
  });

  $('.notification').find('p').last().click(function () {
    $(this).closest('.notification').prev('.envelope').removeClass('send').addClass('new');
    $(this).closest('.notification').prev('.envelope').find('.mailform')[0].reset();
    $(this).closest('.notification').prev('.envelope').find('label').removeClass('show');
    
  });

  $('.mailform').submit(function (event) {
    event.preventDefault();

    $(this).closest('.envelope').removeClass('open').addClass('send');

    //Put jQuery code for submitting the form with AJAX here.
  });

});