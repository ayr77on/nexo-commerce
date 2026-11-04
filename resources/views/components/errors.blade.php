@if($errors->any())
<div class="form-errors" role="alert"><x-icon name="alert" /><div>@foreach($errors->all() as $error)<p>{{ $error }}</p>@endforeach</div></div>
@endif
