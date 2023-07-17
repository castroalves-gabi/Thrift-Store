const items = [
    {
      id: 0,
      nome: 'Camiseta Looney Toones',
      valor: 'R$29,99',
      tamanho: 'M',
      marca: 'Disney',
      condicao: 'Nova',
      img: '/img/produtos/camiseta.png',
      detalhes: 'Camiseta infantil com estampa divertida',
      quantidade: 0,
    },
    {
      id: 1,
      nome: 'Short Jeans',
      valor: 'R$29,99',
      tamanho: '40/M',
      marca: 'Youcom',
      condicao: 'Nova',
      img: '/img/produtos/short.png',
      detalhes: 'Short jeans feminino com cintura alta',
      quantidade: 0,
    },
    {
      id: 2,
      nome: 'Sapato Amarelo',
      valor: 'R$49,99',
      tamanho: '38',
      marca: 'Lolla',
      condicao: 'Nova',
      img: '/img/produtos/sapato.png',
      detalhes: 'Sapato amarelo de salto alto',
      quantidade: 0,
    },
  ];
  
  let filteredItems = [];
  
  inicializarLoja = () => {
    filteredItems = [...items];
    renderProdutos();
  };
  
  renderProdutos = () => {
    const containerProdutos = document.getElementById('produtos');
    containerProdutos.innerHTML = '';
  
    filteredItems.forEach((val) => {
      containerProdutos.innerHTML += `
        <div class="produto-single">
            <img src="${val.img}" />
            <h3>${val.valor}</h3>
            <p>${val.nome}</p>
            <div class="detalhes">
                <p>${val.marca}</p>
                <p>•</p>
                <p>${val.condicao}</p>
                <p>•</p>
                <p>${val.tamanho}</p>
            </div>
            <button key="${val.id}" class="add-carrinho" onclick="adicionarAoCarrinho(${val.id})"><i class='bx bx-cart-add'></i></button>
        </div>
      `;
    });
  };
  
  atualizarCarrinho = () => {
    var containerCarrinho = document.getElementById('carrinho');
    containerCarrinho.innerHTML = "<h2>Carrinho:</h2>";
    let totalGeral = 0;
    let somaProdutos = 0;
    filteredItems.map((val) => {
      if (val.quantidade > 0) {
        const total = parseFloat(val.valor.replace('R$', '')) * val.quantidade;
        totalGeral += total;
        somaProdutos += val.quantidade;
        containerCarrinho.innerHTML += `
          <p>${val.nome} | Quantidade: ${val.quantidade} | Total: R$${total.toFixed(2)}</p>
          <hr>
        `;
      }
    });
    if (somaProdutos === 1) {
      containerCarrinho.innerHTML += `<p>Total (${somaProdutos} item): R$${totalGeral.toFixed(2)}</p>`;
    } else {
      containerCarrinho.innerHTML += `<p>Total (${somaProdutos} itens): R$${totalGeral.toFixed(2)}</p>`;
    }
  };
  
  adicionarAoCarrinho = (id) => {
    items[id].quantidade++;
    atualizarCarrinho();
    return false;
  };
  
  function searchFunction() {
    const searchInput = document.getElementById('searchInput');
    const searchTerm = searchInput.value.trim().toLowerCase();
    filteredItems = items.filter(item => {
      const itemInfo = [
        item.nome,
        item.detalhes,
        item.tamanho,
        item.marca,
        item.condicao,
      ].map(info => info.toLowerCase());
      return itemInfo.some(info => info.includes(searchTerm));
    });
  
    renderProdutos();
  }
  
  function handleKeyPress(event) {
    if (event.key === 'Enter') {
      searchFunction();
    }
  }

  function goToCarrinho() {
    window.location.href = "/views/carrinho.html";
}
  
  inicializarLoja();